import numpy as np, wave, os
SR = 44100

def tone(freq, dur, amp=1.0, decay=18.0, attack=0.004, harm=0.18):
    n = int(SR*dur)
    t = np.arange(n)/SR
    env = np.exp(-decay*t)
    a = int(SR*attack)
    if a > 0:
        env[:a] *= np.linspace(0, 1, a)
    w = np.sin(2*np.pi*freq*t) + harm*np.sin(2*np.pi*2*freq*t)
    return amp*env*w

def seq(parts, total):
    """parts = [(start_s, wave)]"""
    out = np.zeros(int(SR*total))
    for start, w in parts:
        i = int(SR*start)
        out[i:i+len(w)] += w[:max(0, len(out)-i)]
    peak = np.max(np.abs(out))
    if peak > 0:
        out = out/peak*0.25          # ≈ -12 dBFS: audible, never jarring
    # 5 ms tail fade so nothing clicks on stop
    f = int(SR*0.005)
    out[-f:] *= np.linspace(1, 0, f)
    return out

def write(path, data):
    pcm = (np.clip(data, -1, 1)*32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

# SND-1 sent — one short soft blip. Deliberately the quietest of the four: it fires on
# an action the user just took, so it only has to confirm, never announce.
write('message_sent.wav', seq([(0.0, tone(1174.66, 0.10, 0.9, decay=34))], 0.14))

# SND-1 received — a two-note rise. Distinct from sent by SHAPE, not just pitch, so the
# two are told apart without looking.
write('message_received.wav', seq([
    (0.00, tone(987.77, 0.11, 0.85, decay=26)),
    (0.07, tone(1318.51, 0.16, 1.0, decay=20)),
], 0.26))

# SND-2 tx sent — warmer and lower than a message; a payment is a heavier event.
write('tx_sent.wav', seq([
    (0.00, tone(587.33, 0.13, 0.9, decay=20)),
    (0.09, tone(880.00, 0.20, 0.95, decay=15)),
], 0.32))

# SND-2 tx received — the only three-note figure, ascending. Money arriving is the one
# event in the app worth a small reward.
write('tx_received.wav', seq([
    (0.00, tone(523.25, 0.14, 0.85, decay=18)),
    (0.10, tone(659.25, 0.14, 0.9,  decay=17)),
    (0.20, tone(987.77, 0.26, 1.0,  decay=12)),
], 0.48))
print("wav written")
