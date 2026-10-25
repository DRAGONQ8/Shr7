"""Compile readable sources and local media into two identical standalone HTML files."""
import argparse, base64, json, mimetypes
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent

def inline(src):
    if not isinstance(src,str) or src.startswith('data:'): return src
    if src.startswith('https:'): raise ValueError('Remote media must be downloaded before build: '+src)
    p=(ROOT/src).resolve()
    if not p.is_relative_to(ROOT): raise ValueError('Media path must remain inside project')
    mime=mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
    return 'data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()

def build(allow_incomplete=False):
    data=json.loads((ROOT/'content/lesson.json').read_text())
    media=json.loads((ROOT/'content/media.json').read_text())
    media['audio']={}
    manifest=json.loads((ROOT/'content/narration-manifest.json').read_text())
    for clip in manifest['clips']:
        asset='assets/audio/'+clip['id']+'.mp3'
        if not (ROOT/asset).is_file():
            if allow_incomplete: continue
            raise FileNotFoundError(asset)
        media['audio'][clip['id']]={'src':inline(asset),'transcript':clip['transcript']}
    media['video']=inline(media['video']);media['poster']=inline(media['poster'])
    media['effects']={k:inline(v) for k,v in media['effects'].items()}
    def jsjson(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    parts={'STYLES':(ROOT/'src/styles.css').read_text()+'\n'+(ROOT/'src/presentation.css').read_text(),'CONTENT':jsjson(data),'MEDIA':jsjson(media)}
    for key,name in [('CORE','core.js'),('STORAGE','storage.js'),('APP','app.js')]:parts[key]=(ROOT/'src'/name).read_text()
    html=(ROOT/'src/index.template.html').read_text()
    for token,value in parts.items():
        marker='/*__'+token+'__*/'
        assert html.count(marker)==1,marker
        html=html.replace(marker,value)
    assert '/*__' not in html
    for name in ['index.html','khaled-nahw-interactive.html']:(ROOT/name).write_text(html)
    print(f'Built {len(html.encode()):,} bytes; {len(data["questions"])} questions; {len(media["audio"])} embedded recordings')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--allow-incomplete',action='store_true');args=parser.parse_args();build(args.allow_incomplete)
