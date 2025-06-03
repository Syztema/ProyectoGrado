from passlib.hash import sha512_crypt
import sys

def check_password(password, stored_hash):
    return sha512_crypt.verify(password, stored_hash)

if __name__ == "__main__":
    password = sys.argv[1]
    stored_hash = sys.argv[2]
    
    if check_password(password, stored_hash):
        print("OK")
    else:
        print("FAIL")