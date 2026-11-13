# Фоновая мелодия для ролика: синтез без сторонних треков. Использование: python3 promo/music.py <секунды> <файл.wav>
import wave,struct,math,sys
D=float(sys.argv[1]); out=sys.argv[2]; sr=22050; n=int(D*sr); buf=[0.0]*n
beat=60/112; sc=[261.63,293.66,329.63,392.0,440.0,523.25,587.33,659.25,783.99]; prog=[[0,2,4],[3,5,7],[4,6,8],[2,4,6]]
def add(t0,f,dur,amp,dec):
    s=int(t0*sr)
    for i in range(int(dur*sr)):
        if s+i>=n: break
        t=i/sr; buf[s+i]+=amp*math.exp(-t*dec)*min(1,t*80)*(math.sin(2*math.pi*f*t)+0.3*math.sin(4*math.pi*f*t))
t=0.0
while t<D:
    k=int(round(t/(beat/2))); ch=prog[(k//8)%4]; add(t,sc[ch[[0,1,2,1][k%4]]],0.5,0.16,4)
    if k%8==0:
        for c in ch: add(t,sc[c]/2,beat*3.5,0.07,1.2)
    t+=beat/2
m=max(abs(x) for x in buf); fade=int(1.2*sr)
w=wave.open(out,'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
for i,x in enumerate(buf):
    w.writeframes(struct.pack('<h',int(max(-1,min(1,x*0.8/m*((n-i)/fade if i>n-fade else 1)))*32767)))
w.close()
