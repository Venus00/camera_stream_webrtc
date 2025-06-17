#!/usr/bin/python3
import cv2, socket, pickle, os

s=socket.socket(socket.AF_INET , socket.SOCK_DGRAM)  
s.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 10000000) 
serverip="192.168.10.119"      
serverport=2323                
s.sendto("sendStreamPlease".encode(),(serverip,serverport))
while True:
    x=s.recvfrom(100000000)  
    #print(x) 
    data=x[0]
    data=pickle.loads(data) 
    data = cv2.imdecode(data, cv2.IMREAD_COLOR)  
    cv2.imshow("camera", data)
    if cv2.waitKey(10) == 13: 
        break    
cv2.destroyAllWindows() 
cap.release()