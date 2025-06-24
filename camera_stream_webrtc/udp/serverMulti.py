import socket
import threading
import time
import udp_server
from datetime import datetime
import cv2, socket, numpy, pickle   
import sys
class UDPServerMultiClient(udp_server.UDPServer):
    def __init__(self, host, port):
        super().__init__(host, port)
        self.socket_lock = threading.Lock()

    def handle_request(self, data, client_address):
        # handle request
        #print("yes")
        x=self.sock.recvfrom(100000000)   
        clientip = x[1][0]         
        data=x[0]                  
        data=pickle.loads(data)    
        data = cv2.imdecode(data, cv2.IMREAD_COLOR)  
        # if cv2.waitKey() == 27 : 
        #     sys.exit()
        #     cv2.destroyAllWindows()

        with self.socket_lock:
            cv2.imshow("test", data)
            cv2.waitKey(1)
            cv2.destroyAllWindows()
            #self.sock.sendto(resp.encode('utf-8'), client_address)
        #print('\n', resp, '\n')
    def wait_for_client(self):
        try:
            while True: # keep alive

                try: # receive request from client
                    data, client_address = self.sock.recvfrom(100000000)
                    print("antoher client")
                    c_thread = threading.Thread(target = self.handle_request,
                                            args = (data, client_address))
                    c_thread.daemon = True
                    c_thread.start()

                except OSError as err:
                    self.printwt(err)

        except KeyboardInterrupt:
            self.shutdown_server()

def main():
    udp_server_multi_client = UDPServerMultiClient('192.168.10.68', 2323)
    udp_server_multi_client.configure_server()
    udp_server_multi_client.wait_for_client()

if __name__ == '__main__':
    main()
