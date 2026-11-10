"""Standing figures + seated passengers for the IITransit intro.
Units = the car's local units. A standing figure's origin is the point between its feet (y up is negative)."""
INK="#1E1A4D"; SKIN="#D9CBF1"; DEEP="#5A3D7A"; ACC="#AA82BC"; WIN="#C6B4E6"; LIGHT="#E7DFF5"; PALE="#E1D8F2"; ORANGE="#F0913F"

def face(mouth):
    m={"smile":f'<path d="M -4.6 -50.6 Q 0 -46.2 4.6 -50.6" stroke="{INK}" stroke-width="2.2"/>',
       "open":f'<path d="M -5 -51.2 Q 0 -44.2 5 -51.2 Z" fill="{DEEP}" stroke="{INK}" stroke-width="2"/>',
       "grin":f'<path d="M -3.4 -50.2 Q 1.2 -46.6 5.4 -51.4" stroke="{INK}" stroke-width="2.2"/>'}[mouth]
    return f'''<circle cx="0" cy="-56" r="13" fill="{SKIN}" stroke="{INK}" stroke-width="3.4"/>
      <g class="face"><circle cx="-4.6" cy="-56.2" r="2.1" fill="{INK}"/><circle cx="4.6" cy="-56.2" r="2.1" fill="{INK}"/>
      <path d="M -7.2 -61.6 Q -4.8 -63.4 -2.4 -62.2 M 2.4 -62.2 Q 4.8 -63.4 7.2 -61.6" stroke="{INK}" stroke-width="1.9"/>
      {m}</g>'''

HAIR={
 1:f'<path d="M -13.4 -57 C -14.6 -70 -4.5 -74.5 2.5 -71.8 C 9.5 -73.6 15.2 -67 13.4 -58.5 C 11 -63.6 6.4 -66.6 1.2 -65.8 C -2.8 -65.2 -6.2 -67 -8.6 -64.6 C -10.8 -63.4 -12.6 -61 -13.4 -57 Z" fill="{INK}"/>',
 2:f'<circle cx="0" cy="-73" r="5.6" fill="{INK}"/><path d="M -13.6 -54 C -14.2 -68.8 -6.2 -71.6 0 -71.6 C 6.2 -71.6 14.2 -68.8 13.6 -54 C 11.2 -60.8 6.2 -64.6 0 -64.6 C -6.2 -64.6 -11.2 -60.8 -13.6 -54 Z" fill="{INK}"/><path d="M -13.2 -54 C -14.8 -49.5 -14.2 -46 -11.8 -43.6" stroke="{INK}" stroke-width="3.4"/>',
 3:f'<path d="M -13.2 -62 C -13.2 -71.4 -6.4 -74.4 0 -74.4 C 6.4 -74.4 13.2 -71.4 13.2 -62 Z" fill="{DEEP}" stroke="{INK}" stroke-width="3"/><path d="M 7 -62 L 21.5 -62 Q 23 -59.6 19.6 -59.4 L 8.4 -59.8" fill="{DEEP}" stroke="{INK}" stroke-width="3"/><circle cx="0" cy="-74.4" r="1.8" fill="{INK}"/>',
}
SHIRT={1:WIN,2:ACC,3:PALE}; PANTS={1:DEEP,2:INK,3:ACC}; MOUTH={1:"smile",2:"open",3:"grin"}

def head(n): return f'<g class="head">{face(MOUTH[n])}<g class="hair">{HAIR[n]}</g></g>'

def legs(pose, pants):
    if pose=="a":  # stride
        L=f'<path d="M -4 -16 L -9.5 -1.5 M 4 -16 L 9.5 -1.5" stroke="{INK}" stroke-width="3.4"/><ellipse cx="-10.6" cy="-1.2" rx="3.8" ry="2.2" fill="{INK}"/><ellipse cx="11.4" cy="-1.2" rx="3.8" ry="2.2" fill="{INK}"/>'
    else:          # passing: one leg planted, the other lifted
        L=f'<path d="M -3 -16 L -2.6 -1.5 M 3 -16 L 6.4 -8.6 L 4.2 -3.4" stroke="{INK}" stroke-width="3.4"/><ellipse cx="-3.4" cy="-1.2" rx="3.8" ry="2.2" fill="{INK}"/><ellipse cx="5.6" cy="-3.2" rx="3.6" ry="2.1" fill="{INK}"/>'
    shorts=f'<path class="shorts" d="M -9.2 -23.5 L 9.2 -23.5 L 8.4 -15 L 1.4 -15 L 0 -19.4 L -1.4 -15 L -8.4 -15 Z" fill="{pants}" stroke="{INK}" stroke-width="2.6"/>'
    return f'<g class="legs-{pose}">{L}</g>', shorts

def body(n):
    torso=f'<path d="M -8.4 -41 Q 0 -44 8.4 -41 L 9.4 -22.4 Q 0 -20.4 -9.4 -22.4 Z" fill="{SHIRT[n]}" stroke="{INK}" stroke-width="3"/>'
    arms=f'<path d="M -8 -37.6 L -12.6 -24.6 M 8 -37.6 L 12.6 -24.6" stroke="{INK}" stroke-width="3.2"/><circle cx="-12.8" cy="-23.6" r="2.4" fill="{SKIN}" stroke="{INK}" stroke-width="1.8"/><circle cx="12.8" cy="-23.6" r="2.4" fill="{SKIN}" stroke="{INK}" stroke-width="1.8"/>'
    return torso, arms

def figure(n):
    la, shorts = legs("a", PANTS[n]); lb, _ = legs("b", PANTS[n]); torso, arms = body(n)
    behind = front = ""
    if n==1:  # backpack
        behind=f'<path d="M -11.6 -38 Q -11.6 -42 -7.6 -42 L 7.6 -42 Q 11.6 -42 11.6 -38 L 11.6 -22.4 Q 11.6 -19.6 8.6 -19.6 L -8.6 -19.6 Q -11.6 -19.6 -11.6 -22.4 Z" fill="{DEEP}" stroke="{INK}" stroke-width="3"/>'
        front=f'<path d="M -5.4 -41.4 L -5 -27 M 5.4 -41.4 L 5 -27" stroke="{DEEP}" stroke-width="3"/>'
    if n==2:  # rolling suitcase, trailing behind (walking direction = +x)
        behind=f'''<g class="suitcase"><path d="M -21.6 -21.8 L -14.6 -25.8" stroke="{INK}" stroke-width="2.6"/>
        <rect x="-31.4" y="-22" width="15.6" height="19.6" rx="3.4" fill="{LIGHT}" stroke="{INK}" stroke-width="3"/>
        <path d="M -31.4 -12.4 L -15.8 -12.4" stroke="{ACC}" stroke-width="2.4"/><rect x="-27.2" y="-19" width="4.6" height="3.4" rx="1" fill="{ORANGE}"/>
        <circle cx="-28" cy="0.4" r="2.2" fill="{INK}"/><circle cx="-19.2" cy="0.4" r="2.2" fill="{INK}"/></g>'''
    if n==3:  # tote bag on the right shoulder
        front=f'''<g class="tote"><path d="M 6.6 -40 L 11 -29.4 M 6.6 -40 L 19.4 -29.4" stroke="{INK}" stroke-width="2.4"/>
        <path d="M 9.2 -29.6 L 21.4 -29.6 L 22.6 -16 L 8 -16 Z" fill="{WIN}" stroke="{INK}" stroke-width="3"/>
        <path d="M 12.6 -23.4 L 18.2 -23.4" stroke="{DEEP}" stroke-width="2.2"/></g>'''
    return f'''<g id="stand-{n}">
      {behind}
      <g class="legs">{la}{lb}</g>
      {shorts}{torso}{front}{arms}
      <path d="M 0 -43.4 L 0 -41.6" stroke="{INK}" stroke-width="3"/>
      {head(n)}
    </g>'''

def seated(n, cx, cy, shoulders):
    # same head as the standing figure, 0.9 scale; shoulders in the figure's shirt colour
    return f'''<g id="passenger-{n}">
          <path d="{shoulders}" fill="{SHIRT[n]}" stroke="{INK}" stroke-width="3"/>
          <g transform="translate({cx},{cy}) scale(0.9) translate(0,56)">{head(n)}</g>
        </g>'''

SEATS=[(1,84,67,"M 52 86 Q 76 74 100 86 Z"),(2,140,66,"M 118 86 Q 140 72 162 86 Z"),(3,196,66,"M 182 86 Q 196 73 210 86 Z")]
open('figures-parts.py','w').write('')  # marker
import json
json.dump({"stand":{n:figure(n) for n in (1,2,3)},"seated":{n:seated(n,cx,cy,s) for n,cx,cy,s in SEATS}},open('parts.json','w'))

# ---- sheet: each figure in pose A and pose B, ground line, at 3x
cells=""
for i,n in enumerate((1,2,3)):
    for j,pose in enumerate("ab"):
        x=70+i*170+j*72; f=figure(n).replace(f'id="stand-{n}"',f'id="sheet-{n}-{pose}"')
        hide="b" if pose=="a" else "a"
        f=f.replace(f'<g class="legs-{hide}">',f'<g class="legs-{hide}" display="none">')
        cells+=f'<g transform="translate({x},104)">{f}</g>'
sheet=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 124" width="1680" height="372" fill="none"><g stroke-linecap="round" stroke-linejoin="round">
<path d="M 20 105 L 540 105" stroke="#C7BBD9" stroke-width="3"/>{cells}</g></svg>'''
open('figures-sheet.svg','w').write(sheet)
