# 原创程序合成配乐：无外部歌曲、采样或第三方依赖。
from pathlib import Path
import array,math,random,wave
rate=48000;duration=32;total=rate*duration;buf=array.array('f',[0])*total
chords=[[261.6256,329.6276,391.9954,493.8833],[174.6141,220,261.6256,329.6276],[220,261.6256,329.6276,391.9954],[195.9977,246.9417,293.6648,440]]
def tone(start,length,freq,amp,pluck=False):
    first=int(start*rate)
    for j in range(min(int(length*rate),total-first)):
        t=j/rate
        env=(1-math.exp(-t*110))*math.exp(-t*4.2) if pluck else min(1,t/.8)*min(1,(length-t)/1.0)*.45
        value=math.sin(math.tau*freq*t)+.18*math.sin(math.tau*freq*2*t)
        buf[first+j]+=amp*env*value
for block in range(8):
    chord=chords[block%4];start=block*4
    for f in chord:tone(start,4.65,f/2,.034)
    pattern=[0,2,1,3,2,1,3,2]
    for k,index in enumerate(pattern):
        when=start+k*.5;tone(when,1.9,chord[index]*2,.115 if k%2==0 else .073,True)
        if when+.25<31:tone(when+.25,1.4,chord[index]*2,.022,True)
    tone(start,3,chord[0]/2,.06,True)
# 轻微的节拍与切镜水滴，用于连接镜头而非覆盖画面。
random.seed(165)
for beat in range(1,62):
    start=int(beat*.5*rate)
    for j in range(int(.055*rate)):
        if start+j>=total:break
        t=j/rate;buf[start+j]+=(random.random()*2-1)*math.exp(-t*95)*.015
for when in [4,10,16,22,28]:
    start=int(when*rate)
    for j in range(int(.28*rate)):
        t=j/rate;buf[start+j]+=.038*math.sin(math.tau*(920*t-260*t*t))*math.exp(-t*18)
peak=max(abs(x) for x in buf);out=array.array('h')
for i,x in enumerate(buf):
    fade=min(1,i/(rate*.6),(total-i)/(rate*2.1));left=x*.52/peak*fade;right=(x*.82+(buf[i-1200] if i>=1200 else 0)*.18)*.52/peak*fade
    out.extend([int(max(-1,min(1,left))*32767),int(max(-1,min(1,right))*32767)])
dest=Path(__file__).resolve().parent/'score.wav'
with wave.open(str(dest),'wb')as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes(out.tobytes())
print(dest)
