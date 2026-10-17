"""Synthesises a soundtrack for each promo film (48 kHz stereo WAV) — no samples, no network.
Usage: python3 audio.py <out.wav> <film> <duration>"""
import numpy as np, wave, sys, os

out_path = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/promo/promo.wav'
FILM = sys.argv[2] if len(sys.argv) > 2 else 'promo'
DUR = float(sys.argv[3]) if len(sys.argv) > 3 else 15.0

SR = 48000
N = int(SR * DUR)
t = np.arange(N) / SR
mix = np.zeros(N)

def env(start, length, attack=0.01, release=0.2):
    e = np.zeros(N); a, b = int(start * SR), min(int((start + length) * SR), N)
    if b <= a: return e
    seg = np.ones(b - a)
    na, nr = min(int(attack * SR), len(seg)), min(int(release * SR), len(seg))
    if na: seg[:na] = np.linspace(0, 1, na)
    if nr: seg[-nr:] *= np.linspace(1, 0, nr)
    e[a:b] = seg; return e

def tone(freq, start, length, amp=0.2, kind='sine', attack=0.01, release=0.25, glide=None):
    f = np.full(N, float(freq))
    if glide is not None:
        a, b = int(start * SR), min(int((start + length) * SR), N)
        if b > a: f[a:b] = np.linspace(freq, glide, b - a)
    ph = np.cumsum(2 * np.pi * f / SR)
    w = np.sin(ph) if kind == 'sine' else np.sign(np.sin(ph)) * 0.6
    return w * env(start, length, attack, release) * amp

def noise(start, length, amp=0.2, lp=0.25, attack=0.002, release=0.2):
    rng = np.random.default_rng(int(start * 1000) + 11)
    w = rng.standard_normal(N)
    a, b = int(start * SR), min(int((start + length + release) * SR) + 1, N)
    out = np.zeros(N); acc = 0.0
    if b > a:
        seg = w[a:b]; filt = np.empty(len(seg))
        for i, v in enumerate(seg):
            acc += lp * (v - acc); filt[i] = acc
        out[a:b] = filt
    return out * env(start, length, attack, release) * amp * 3

def sub(start, f0=70, f1=38, length=0.9, amp=0.5):
    return tone(f0, start, length, amp, 'sine', 0.004, length * 0.85, glide=f1)

def riser(start, length, amp=0.18):
    out = np.zeros(N); a, b = int(start * SR), min(int((start + length) * SR), N)
    if b <= a: return out
    k = np.linspace(0, 1, b - a)
    ph = np.cumsum(2 * np.pi * (180 + 1400 * k ** 2.2) / SR)
    out[a:b] = np.sin(ph) * (k ** 1.6) * amp
    return out + noise(start, length, amp * 0.5, lp=0.3, attack=length * 0.9, release=0.05)

def tick(start, amp=0.25, bright=2600):
    out = np.zeros(N); a = int(start * SR); L = int(0.022 * SR)
    if a + L >= N or a < 0: return out
    rng = np.random.default_rng(a % 9973)
    w = rng.standard_normal(L) * np.power(np.linspace(1, 0, L), 3)
    ph = 2 * np.pi * bright * np.arange(L) / SR
    out[a:a + L] = (w * 0.8 + np.sin(ph) * 0.35 * np.power(np.linspace(1, 0, L), 4)) * amp
    return out

def pad():
    m = np.zeros(N)
    for f, a in [(55, 0.10), (82.4, 0.07), (110, 0.06), (164.8, 0.035), (220, 0.025)]:
        m += tone(f, 0.0, DUR, a, 'sine', min(1.2, DUR * 0.2), min(1.4, DUR * 0.25))
    return m + noise(0.0, DUR, 0.03, lp=0.02, attack=min(1.5, DUR * 0.2), release=min(1.5, DUR * 0.2))

def hit(at, f0=90, f1=40, amp=0.55, bright=0.18):
    return sub(at, f0, f1, 1.2, amp) + noise(at, 0.7, bright, lp=0.5, attack=0.004, release=0.6)

def case_sequence(burst):
    """riser → crack → boom → slowing roulette ticks → win chord"""
    m = riser(max(0.02, burst - 1.1), min(1.1, burst - 0.02), 0.22)
    m += tick(burst - 0.30, 0.28, 3200) + tick(burst - 0.17, 0.32, 3600)
    m += sub(burst, 110, 32, 1.8, 0.75) + noise(burst, 1.1, 0.4, lp=0.6, attack=0.002, release=1.0)
    m += tone(1760, burst, 0.5, 0.07, 'sine', 0.002, 0.48)
    rt = burst + 0.14
    while rt < burst + 2.0:
        k = (rt - burst) / 2.0
        m += tick(rt, 0.16 * (1 - k * 0.55), 2000 + 1500 * (1 - k))
        rt += 0.035 + 0.16 * (k ** 2.6)
    w = burst + 2.05
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
        m += tone(f, w + i * 0.055, 1.0, 0.085, 'sine', 0.005, 0.95)
    return m + sub(w, 80, 44, 1.0, 0.3)

def cta(at, length):
    m = sub(at, 100, 36, min(2.2, length), 0.6)
    for i, f in enumerate([392.0, 523.25, 659.25, 783.99, 1046.5]):
        m += tone(f, at + i * 0.04, length, 0.075, 'sine', 0.02, length * 0.9)
    m += noise(at, length, 0.12, lp=0.7, attack=0.01, release=length * 0.9)
    for i in range(int(length / 0.16)):
        m += tick(at + 0.1 + i * 0.16, 0.05, 5200 + i * 220)
    return m

mix += pad()
if FILM == 'promo':
    mix += hit(0.15)
    for i, s in enumerate([2.62, 2.80, 2.98]):
        mix += noise(s, 0.42, 0.11, lp=0.25, attack=0.08, release=0.3) + tone(300 + i * 90, s + 0.30, 0.18, 0.09)
    mix += sub(3.6, 70, 42, 0.8, 0.28)
    mix += case_sequence(5.4 + 1.15)
    for i, s in enumerate([9.5, 9.68, 9.86]):
        mix += tone(700 + i * 160, s, 0.24, 0.07) + tone(1400 + i * 240, s + 0.02, 0.18, 0.035)
    mix += sub(9.45, 68, 40, 0.9, 0.26) + cta(12.02, 2.7)
elif FILM == 'teaser':
    mix += hit(0.1, 80, 38, 0.4)
    mix += case_sequence(0.9)
    mix += cta(4.25, 2.5)
elif FILM == 'drop':
    mix += hit(0.15)
    for i, s in enumerate([2.25, 2.43, 2.61]):
        mix += noise(s, 0.42, 0.11, lp=0.25, attack=0.08, release=0.3) + tone(300 + i * 90, s + 0.30, 0.18, 0.09)
    mix += sub(3.3, 70, 42, 0.8, 0.28) + cta(5.25, 2.6)
elif FILM == 'invite':
    mix += hit(0.12, 85, 40, 0.45)
    for i, s in enumerate([0.9, 1.25, 1.6]):
        mix += tone(520 + i * 180, s, 0.3, 0.08) + tone(1040 + i * 260, s + 0.02, 0.2, 0.03)
    mix += cta(3.25, 2.6)

mix = np.tanh(mix * 1.25 * 0.9) / 1.25
fi, fo = int(0.25 * SR), int(min(0.6, DUR * 0.1) * SR)
mix[:fi] *= np.linspace(0, 1, fi)
mix[-fo:] *= np.linspace(1, 0, fo)
mix = mix / (np.max(np.abs(mix)) or 1.0) * 0.89
pcm = (np.clip(np.stack([mix, np.roll(mix, 12)], axis=1), -1, 1) * 32767).astype('<i2')
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with wave.open(out_path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', out_path, FILM, round(len(pcm) / SR, 2), 's')
