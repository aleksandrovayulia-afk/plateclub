"""Synthesises the promo soundtrack (15 s, 48 kHz stereo WAV) — no external samples."""
import numpy as np, wave, sys, os

SR, DUR = 48000, 15.0
N = int(SR * DUR)
t = np.arange(N) / SR
mix = np.zeros(N)

def env(start, length, attack=0.01, release=0.2):
    e = np.zeros(N)
    a, b = int(start * SR), int((start + length) * SR)
    b = min(b, N)
    if b <= a: return e
    seg = np.ones(b - a)
    na, nr = int(attack * SR), int(release * SR)
    na, nr = min(na, len(seg)), min(nr, len(seg))
    if na: seg[:na] = np.linspace(0, 1, na)
    if nr: seg[-nr:] *= np.linspace(1, 0, nr)
    e[a:b] = seg
    return e

def tone(freq, start, length, amp=0.2, kind='sine', attack=0.01, release=0.25, glide=None):
    f = np.full(N, float(freq))
    if glide is not None:
        a, b = int(start * SR), min(int((start + length) * SR), N)
        if b > a: f[a:b] = np.linspace(freq, glide, b - a)
    ph = np.cumsum(2 * np.pi * f / SR)
    w = np.sin(ph) if kind == 'sine' else np.sign(np.sin(ph)) * 0.6 if kind == 'square' else 2 * (ph / (2 * np.pi) % 1) - 1
    return w * env(start, length, attack, release) * amp

def noise(start, length, amp=0.2, lp=0.25, attack=0.002, release=0.2):
    rng = np.random.default_rng(int(start * 1000) + 11)
    w = rng.standard_normal(N)
    # cheap one-pole low-pass
    out = np.zeros(N); acc = 0.0
    k = lp
    for i in range(int(start * SR), min(int((start + length) * SR) + int(release * SR) + 1, N)):
        acc += k * (w[i] - acc); out[i] = acc
    return out * env(start, length, attack, release) * amp * 3

def sub(start, f0=70, f1=38, length=0.9, amp=0.5):
    return tone(f0, start, length, amp, 'sine', 0.004, length * 0.85, glide=f1)

def riser(start, length, amp=0.18):
    out = np.zeros(N)
    a, b = int(start * SR), min(int((start + length) * SR), N)
    if b <= a: return out
    k = np.linspace(0, 1, b - a)
    f = 180 + 1400 * k ** 2.2
    ph = np.cumsum(2 * np.pi * f / SR)
    out[a:b] = np.sin(ph) * (k ** 1.6) * amp
    return out + noise(start, length, amp * 0.5, lp=0.05 + 0.5 * 0.5, attack=length * 0.9, release=0.05)

def tick(start, amp=0.25, bright=2600):
    out = np.zeros(N)
    a = int(start * SR); L = int(0.022 * SR)
    if a + L >= N: return out
    rng = np.random.default_rng(a % 9973)
    w = rng.standard_normal(L) * np.power(np.linspace(1, 0, L), 3)
    ph = 2 * np.pi * bright * np.arange(L) / SR
    out[a:a + L] = (w * 0.8 + np.sin(ph) * 0.35 * np.power(np.linspace(1, 0, L), 4)) * amp
    return out

# --- pad: slow minor chord bed through the whole film ---
for f, a in [(55, 0.10), (82.4, 0.07), (110, 0.06), (164.8, 0.035), (220, 0.025)]:
    mix += tone(f, 0.0, DUR, a, 'sine', 1.2, 1.4)
mix += noise(0.0, DUR, 0.03, lp=0.02, attack=1.5, release=1.5)

# --- 0 s logo hit ---
mix += sub(0.15, 90, 40, 1.4, 0.55)
mix += noise(0.15, 0.7, 0.18, lp=0.5, attack=0.004, release=0.6)
mix += tone(880, 0.16, 0.9, 0.05, 'sine', 0.01, 0.85)

# --- 2.6 s plates fly in: three soft whooshes + clicks ---
for i, s in enumerate([2.62, 2.80, 2.98]):
    mix += noise(s, 0.42, 0.11, lp=0.25, attack=0.08, release=0.3)
    mix += tone(300 + i * 90, s + 0.30, 0.18, 0.09, 'sine', 0.004, 0.16)
mix += sub(3.6, 70, 42, 0.8, 0.28)

# --- 5.4 s case scene: riser → crack → boom → roulette ticks → win chord ---
BURST = 5.4 + 1.15
mix += riser(5.45, BURST - 5.45, 0.22)
mix += tick(BURST - 0.30, 0.28, 3200); mix += tick(BURST - 0.17, 0.32, 3600)
mix += sub(BURST, 110, 32, 1.8, 0.75)
mix += noise(BURST, 1.1, 0.4, lp=0.6, attack=0.002, release=1.0)
mix += tone(1760, BURST, 0.5, 0.07, 'sine', 0.002, 0.48)
# roulette: ticks that slow down
roll_t, gap = BURST + 0.14, 0.035
while roll_t < BURST + 2.0:
    k = (roll_t - BURST) / 2.0
    mix += tick(roll_t, 0.16 * (1 - k * 0.55), 2000 + 1500 * (1 - k))
    gap = 0.035 + 0.16 * (k ** 2.6)
    roll_t += gap
# win sting
W = BURST + 2.05
for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
    mix += tone(f, W + i * 0.055, 1.1, 0.085, 'sine', 0.005, 1.0)
mix += sub(W, 80, 44, 1.0, 0.3)

# --- 9.4 s market: three soft coin blips ---
for i, s in enumerate([9.5, 9.68, 9.86]):
    mix += tone(700 + i * 160, s, 0.24, 0.07, 'sine', 0.004, 0.22)
    mix += tone(1400 + i * 240, s + 0.02, 0.18, 0.035, 'sine', 0.004, 0.16)
mix += sub(9.45, 68, 40, 0.9, 0.26)

# --- 12 s CTA: uplift chord + shimmer ---
mix += sub(12.02, 100, 36, 2.2, 0.6)
for i, f in enumerate([392.0, 523.25, 659.25, 783.99, 1046.5]):
    mix += tone(f, 12.05 + i * 0.04, 2.7, 0.075, 'sine', 0.02, 2.4)
mix += noise(12.0, 2.6, 0.12, lp=0.7, attack=0.01, release=2.4)
for i in range(16):
    mix += tick(12.1 + i * 0.16, 0.05, 5200 + i * 220)

# --- master: soft clip + fades ---
mix *= 0.9
mix = np.tanh(mix * 1.25) / 1.25
fade_in, fade_out = int(0.25 * SR), int(0.6 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)
mix[-fade_out:] *= np.linspace(1, 0, fade_out)
peak = np.max(np.abs(mix)) or 1.0
mix = mix / peak * 0.89

stereo = np.stack([mix, np.roll(mix, 12)], axis=1)  # tiny width
pcm = (np.clip(stereo, -1, 1) * 32767).astype('<i2')

out = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/promo/promo.wav'
os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', out, round(len(pcm) / SR, 2), 's')
