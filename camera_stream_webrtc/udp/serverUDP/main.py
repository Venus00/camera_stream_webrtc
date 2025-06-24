
#!/usr/bin/python3

import cv2, socket, numpy, pickle
from multiprocessing import Process,set_start_method

s=socket.socket(socket.AF_INET , socket.SOCK_DGRAM)  #
ip="192.168.10.119"
port=2323
s.bind((ip,port))
cap = cv2.VideoCapture(0)
#ret,photo = cap.read()
#print(photo)
#ret, buffer = cv2.imencode(".jpg", photo, [int(cv2.IMWRITE_JPEG_QUALITY),30])
#x_as_bytes = pickle.dumps(buffer)

x_as_bytes = ''.encode()


def readCamera(id):
    global x_as_bytes
    while True :
        ret,photo = cap.read()
        #print(photo)
        ret, buffer = cv2.imencode(".jpg", photo, [int(cv2.IMWRITE_JPEG_QUALITY),30])
        x_as_bytes = pickle.dumps(buffer)

if __name__ == '__main__':
    set_start_method('fork')
    p = Process(target=readCamera, args=(0,))
    p.start()
    x=s.recvfrom(100000000)
    while True:
        #print(x)
        clientip = x[1][0]
        data=x[0]
        s.sendto(x_as_bytes,(clientip , x[1][1]))
        if cv2.waitKey(10) == 13:
            break

