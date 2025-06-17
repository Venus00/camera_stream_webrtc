#!/usr/bin/python3
import cv2, socket, numpy, pickle   

s=socket.socket(socket.AF_INET , socket.SOCK_DGRAM)  #
ip="192.168.10.68"   
port=2323            
s.bind((ip,port))    

while True:
    x=s.recvfrom(100000000)   
    clientip = x[1][0]         
    data=x[0]                  
    data=pickle.loads(data)    
    data = cv2.imdecode(data, cv2.IMREAD_COLOR)  
    cv2.imshow(clientip, data)
    if cv2.waitKey(10) == 13: 
        break
cv2.destroyAllWindows()