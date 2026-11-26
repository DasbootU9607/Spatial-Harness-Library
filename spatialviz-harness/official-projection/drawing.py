"""Recheck source PDF crops and trace every displayed CAD option to a drawing operation."""
import base64
import hashlib
import cv2
import fitz
import numpy as np
from pixels import decode


def drawing_crops(pipeline):
    data=base64.b64decode(pipeline["drawingPdf"],validate=True)
    assert hashlib.sha256(data).hexdigest()==pipeline["drawingSha256"]
    with fitz.open(stream=data,filetype="pdf") as doc:
        assert len(doc)==1
        pix=doc[0].get_pixmap(matrix=fitz.Matrix(2,2))
        rgb=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3)
    bw=(rgb.mean(2)<128).astype(np.uint8)
    _,_,stats,_=cv2.connectedComponentsWithStats(bw)
    boxes=sorted(stats[1:],key=lambda b:b[2]*b[3],reverse=True)[:3]
    top_down=sorted(boxes,key=lambda b:b[1])
    front,left=sorted(top_down[:2],key=lambda b:b[0])
    for name,(x,y,w,h,_) in zip(("Front","Left","Top"),(front,left,top_down[2])):
        assert min(x,y,pix.width-x-w,pix.height-y-h)>10,"Page clips geometry"
        expected=np.where(bw[y-10:y+h+10,x-10:x+w+10],32,255).astype(np.uint8)
        actual=np.asarray(decode(pipeline["sources"][name]).convert("L"))
        assert np.array_equal(expected,actual),"PDF crop mismatch: "+name


def deleted_lines(raw):
    mask=(raw<128).astype(np.uint8)*255
    current=mask.copy()
    shells=[]
    while current.any():
        contours,_=cv2.findContours(current,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        shells.append(contours)
        cv2.drawContours(current,contours,-1,0,10)
    for contours in shells[1:]:
        for contour in contours:
            kept=mask.copy()
            cv2.drawContours(kept,[contour],-1,0,2)
            yield 255-cv2.morphologyEx(kept,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))


def option_operations(pipeline,target):
    drawing_crops(pipeline)
    for label in "ABC":
        panel=pipeline["views"][label]
        source,letter=panel["file"].split("_")
        assert letter==label and source in ("Front","Left","Top")
        raw=np.asarray(decode(pipeline["sources"][source]).convert("L"))
        actual=np.asarray(decode(panel["image"]).convert("L"))
        if label==pipeline["annotation"]["Answer"]:
            assert source==target and np.array_equal(raw,actual)
            continue
        transforms=[np.fliplr(raw),np.flipud(raw),np.rot90(raw,-1)]
        assert any(np.array_equal(actual,t) for t in transforms) or any(np.array_equal(actual,t) for t in deleted_lines(raw)), "Untraced CAD option transform"
