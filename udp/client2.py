#!/usr/bin/python3
import cv2, socket, pickle, os
from multiprocessing import Process
import os


def streamCamera(id):
    while True : 
        ret,photo = cap.read() 
        ret, buffer = cv2.imencode(".jpg", photo, [int(cv2.IMWRITE_JPEG_QUALITY),30])  
        x_as_bytes = pickle.dumps([id,buffer]) 
        s.sendto(x_as_bytes,(serverip , serverport)) 

        return x_as_bytes         


if __name__ == '__main__':
    p = Process(target=streamCamera, args=(0,))
    p2 = Process(target=streamCamera, args=(1,))

    p.start()
    p2.start()
    #p.join()
s=socket.socket(socket.AF_INET , socket.SOCK_DGRAM)  
s.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 10000000) 
serverip="192.168.10.68"      
serverport=2323                
cap = cv2.VideoCapture(0)      
cap2 = cv2.VideoCapture(1)
# while True:
#     ret2,photo2 = cap2.read()
#     #cv2.imshow('my pic', photo) 
#     #x_as_bytes = pickle.dumps(buffer)   
#     if cv2.waitKey(10) == 13:    
#         break                    
# Destroy all Windows/close
# cv2.destroyAllWindows() 
# cap.release()