"""Structural checks for the five-page deliverable (standard library only)."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

root=Path(__file__).parent/'dist'
class Document(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=set(); self.refs=[]; self.images=[]; self.frames=[]; self.labels=[]; self.fields=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids, f'Duplicate id {a["id"]}'
            self.ids.add(a['id'])
        if tag=='a': self.refs.append(a.get('href',''))
        if tag in ('script','img','link'): self.refs.append(a.get('src',a.get('href','')))
        if tag=='img': self.images.append(a)
        if tag=='iframe': self.frames.append(a)
        if tag=='label': self.labels.append(a.get('for'))
        if tag in ('input','select','textarea'): self.fields.append(a.get('id'))

pages=list(root.glob('*.html'))
assert len(pages)==5, 'Expected exactly five module pages'
docs={}
for page in pages:
    d=Document(); d.feed(page.read_text(encoding='utf-8')); docs[page.name]=d
    assert {'main','objectives','lecture','watch','lab','summary'}<=d.ids
    assert d.images and all(x.get('alt') for x in d.images)
    assert d.frames and all(x.get('title') and 'youtube-nocookie.com/embed/' in x.get('src','') for x in d.frames)
    assert set(d.fields)<=set(d.labels), f'Missing field labels in {page.name}'
for name,d in docs.items():
    for ref in d.refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc: continue
        target=root/unquote(url.path) if url.path else root/name
        assert target.exists(), f'Missing local target {name}: {ref}'
        if url.fragment and target.suffix=='.html': assert url.fragment in docs[target.name].ids, f'Missing anchor {ref}'
print('PASS: five pages, objectives and lesson sections, lab pictures, video embeds, labels, local files and navigation anchors.')
