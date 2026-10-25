"""Recover the instructor video and persist small, normalized Arabic recordings."""
import base64, concurrent.futures, hashlib, json, os, re, subprocess, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'assets/audio'

def prepare():
    ASSETS.mkdir(parents=True,exist_ok=True)
    html=(ROOT/'khaled-nahw-interactive.html').read_text()
    old=json.loads(re.search(r'<script id="media-data"[^>]*>(.*?)</script>',html,re.S)[1])
    config=json.loads((ROOT/'content/media.json').read_text())
    for key in ['video','poster']:
        path=ROOT/config[key]
        if not path.exists():
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_bytes(base64.b64decode(old[key].split(',')[1]))
    for key,relative in config['effects'].items():
        path=ROOT/relative
        if not path.exists():path.write_bytes(base64.b64decode(old['effects'][key].split(',')[1]))
    clips=json.loads((ROOT/'content/narration-manifest.json').read_text())['clips']
    info_path=ASSETS/'audio-info.json'
    previous=json.loads(info_path.read_text()) if info_path.exists() else {}
    def process(clip):
        key=clip['id'];path=ASSETS/(key+'.mp3');fingerprint=hashlib.sha256(clip['transcript'].encode()).hexdigest()
        item=previous.get(key,{})
        if path.exists() and item.get('transcript_sha256')==fingerprint and item.get('sha256')==hashlib.sha256(path.read_bytes()).hexdigest():return key,item
        embedded=old.get('audio',{}).get(key,{})
        if embedded.get('src','').startswith('data:audio/') and embedded.get('transcript')==clip['transcript']:
            # Reusing an embedded recording must not repeatedly re-encode it.
            path.write_bytes(base64.b64decode(embedded['src'].split(',')[1]))
        else:
            url=clip['url'];assert url.startswith('https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/')
            with urllib.request.urlopen(url,timeout=90) as response:path.write_bytes(response.read())
            normalized=ASSETS/(key+'.normalized.mp3')
            subprocess.run(['ffmpeg','-nostdin','-loglevel','error','-y','-i',str(path),'-map_metadata','-1','-ac','1','-ar','24000','-b:a','64k','-write_xing','0',str(normalized)],check=True)
            normalized.replace(path)
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(path)]))
        duration=float(probe['format']['duration']);assert duration>0.3,key
        return key,{'transcript_sha256':fingerprint,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'duration':round(duration,3)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:info=dict(pool.map(process,clips))
    info_path.write_text(json.dumps(info,indent=2,sort_keys=True)+'\n')
    print('Prepared',len(info),'recordings;',round(sum(i['duration'] for i in info.values()),1),'seconds;',sum(p.stat().st_size for p in ASSETS.glob('*.mp3')),'bytes')

if __name__=='__main__':prepare()

