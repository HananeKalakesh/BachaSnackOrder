# Builds the A3 landscape print menus (English and Arabic) from menu-data.json (a copy of the Menu tab of the sheet):
#   menu-a3-en.html / menu-a3-ar.html, then render.cjs turns them into PDF and PNG.
# Run from this folder: python3 make-menu.py && node render.cjs
# Items hidden from the order screen (and not just sold out for now) are left out.
import json, re

ROWS = [r for r in json.load(open('menu-data.json')) if r['on'] or r['sold']]
SITE = 'hananekalakesh.github.io/BachaSnackOrder'
PHONE = '76 075 724'
QR = re.sub(r'<\?xml[^>]*>', '', open('qr-menu.svg').read()).replace('width="33mm" height="33mm" ', '')
LOGO = open('../elbash/v4/noar-paper.svg').read()

T = {
  'en': {'order': 'Order online', 'scan': 'Scan to see the photos and order', 'call': 'Call us', 'hours': 'Every day 1 – 4 PM &amp; 6 – 11 PM · Closed on Mondays',
         'll': 'Prices in L.L. · may change with market rates', 'pcs': '{} PCS', 'kg': {'1/2 KG': '½ KG', '1 KG': '1 KG'}, 'tag': 'Tekram ya basha!'},
  'ar': {'order': 'اطلب أونلاين', 'scan': 'امسح الرمز لتشوف الصور وتطلب', 'call': 'للاتصال', 'hours': 'كل يوم من 1 لـ 4 بعد الضهر ومن 6 لـ 11 بالليل · مسكّرين يوم الاثنين',
         'll': 'الأسعار بالليرة اللبنانية · ممكن تتغيّر حسب السوق', 'pcs': '{} قطع', 'kg': {'1/2 KG': 'نص كيلو', '1 KG': 'كيلو'}, 'tag': 'تكرم يا باشا!'},
}
HEAD = {'Appetizers': 'مقبلات', 'Fries': 'بطاطا', 'Other Appetizers': 'مقبلات تانية', 'Meals': 'وجبات', 'Family Meals': 'وجبات عائلية',
        'Plates': 'صحون', 'Sandwiches': 'ساندويشات', 'Chicken': 'دجاج', 'Beef': 'لحمة', 'Other': 'غير', 'Burgers': 'برغر',
        'Sauces & Extras': 'صوصات وإضافات', 'Drinks': 'مشروبات'}
# sections: (title, [(sub-title or None, sheet category)])
SECTIONS = {
  'apps': ('Appetizers', [('Fries', 'Fries'), ('Other Appetizers', 'Appetizers')]),
  'meals': ('Meals', [(None, 'Meals')]), 'family': ('Family Meals', [(None, 'Family Meals')]), 'plates': ('Plates', [(None, 'Plates')]),
  'sand': ('Sandwiches', [('Chicken', 'Chicken Sandwiches'), ('Beef', 'Beef Sandwiches'), ('Other', 'Other Sandwiches')]),
  'burgers': ('Burgers', [('Chicken', 'Chicken Burgers'), ('Beef', 'Beef Burgers')]),
  'extras': ('Sauces & Extras', [(None, 'Sauces & Extras')]), 'drinks': ('Drinks', [(None, 'Drinks')]),
}
COLUMNS = [['apps', 'burgers'], ['meals', 'extras'], ['family', 'drinks'], ['sand', 'plates']]

def price(r):
    return r['usd'] if r['usd'] else r['lbp']

# one line per dish; the same dish in several sizes (4-7 PCS, 7/14 PCS, ½/1 KG) on one line with each size's price
def lines(cat, lang):
    out, seen = [], {}
    for r in [x for x in ROWS if x['cat'] == cat]:
        m = re.match(r'^(.*?)\s+(\d+ PCS|1/2 KG|1 KG)$', r['name'])
        base = m.group(1) if m and (cat == 'Meals' or 'KG' in m.group(2)) else r['name']
        base = re.sub(r'^Half (Wings Meal)$', r'\1', base)
        key = base
        if m and key in seen and not re.search(r'\d+-\d+', r['name']):
            seen[key]['sizes'].append((m.group(2), price(r)))
            continue
        ar = r['ar']
        if m and base != r['name']:
            ar = re.sub(r'\s*(\d+ قطع|\d+ قطعة|قطعتين|نص كيلو|1 كيلو)$', '', ar).replace('نصف ', '')
        x = {'en': base, 'ar': ar, 'price': price(r), 'sizes': [(m.group(2), price(r))] if m and base != r['name'] else []}
        seen[key] = x; out.append(x)
    rank = lambda s: 0.5 if s.startswith('1/2') else float(s.split()[0])
    for x in out:
        x['sizes'].sort(key=lambda sp: rank(sp[0]))
        if len(x['sizes']) < 2:   # one size only: keep its full name
            if x['sizes']:
                r = [y for y in ROWS if y['cat'] == cat and y['name'].startswith(x['en']) and price(y) == x['sizes'][0][1]][0]
                x.update(en=r['name'], ar=r['ar'])
            x['sizes'] = []
    return out

def size_label(s, lang):
    if 'KG' in s: return T[lang]['kg'][s]
    return T[lang]['pcs'].format(s.split()[0])

def build(lang):
    t, rtl = T[lang], lang == 'ar'
    h = lambda s: HEAD[s] if rtl else s
    def row(x):
        if x['sizes']:
            return (f'<div class="row multi"><span class="name">{x[lang]}</span></div><div class="sizes">' +
                    ''.join(f'<span><i>{size_label(s, lang)}</i><b>{p}</b></span>' for s, p in x['sizes']) + '</div>')
        return f'<div class="row"><span class="name">{x[lang]}</span><span class="dots"></span><b class="price">{x["price"]}</b></div>'
    def sec(k):
        title, groups = SECTIONS[k]
        return f'<section><h2>{h(title)}</h2>' + ''.join(
            (f'<h3>{h(sub)}</h3>' if sub else '') + ''.join(row(x) for x in lines(cat, lang)) for sub, cat in groups) + '</section>'
    cols = ''.join('<div class="col">' + ''.join(sec(k) for k in c) + '</div>' for c in COLUMNS)
    font = "Cairo" if rtl else "'Plus Jakarta Sans'"
    disp = "Lalezar, Cairo" if rtl else "Archivo"
    return f'''<!doctype html><html lang="{lang}" dir="{'rtl' if rtl else 'ltr'}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,700..900&family=Cairo:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Lalezar&display=swap" rel="stylesheet">
<style>
@page{{size:A3 landscape;margin:0}}
*{{box-sizing:border-box}}
html,body{{margin:0;width:420mm;height:297mm;background:#FAF5EC;color:#1A1A17;font-family:{font},sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.page{{width:420mm;height:297mm;display:flex;flex-direction:column}}
header{{background:#1F4A37;color:#FAF5EC;padding:6mm 14mm;display:flex;align-items:center;gap:12mm}}
.logo{{width:62mm;flex:none}}.logo svg{{width:100%;height:auto;display:block}}
.mid{{flex:1;display:flex;flex-direction:column;gap:2.6mm;align-items:center;text-align:center}}
.order{{background:#F2B705;color:#1A1A17;border-radius:99mm;padding:2.6mm 10mm;font:800 8mm/1.1 {font},sans-serif}}
.url{{font:800 6.2mm/1 'Plus Jakarta Sans',sans-serif;direction:ltr;letter-spacing:.1mm}}
.hours{{font-size:5mm;font-weight:600;opacity:.92}}
.call{{font-size:5.2mm;font-weight:700}}.call bdi{{font-family:'Plus Jakarta Sans';font-weight:800;color:#F2B705}}
.qr{{display:flex;align-items:center;gap:5mm;flex:none}}
.qr .box{{background:#fff;padding:2.6mm;border-radius:3mm;width:40mm;height:40mm}}.qr svg{{width:100%;height:100%;display:block}}
.qr p{{margin:0;width:36mm;font:800 5.4mm/1.3 {font},sans-serif;color:#F2B705}}
main{{flex:1;min-height:0;display:grid;grid-template-columns:repeat(4,1fr);gap:0 10mm;padding:7mm 12mm 0}}
.col{{min-height:0;overflow:hidden}}.col+.col{{border-inline-start:.35mm solid #1F4A3722;padding-inline-start:10mm;margin-inline-start:-5mm}}
section{{margin-bottom:5mm}}
h2{{margin:0 0 2mm;padding:1.6mm 4.5mm 1.2mm;border-radius:2.5mm;background:#C8102E;color:#fff;font:{'400' if rtl else '900'} 7.4mm/1.1 {disp},sans-serif;{'' if rtl else 'font-stretch:78%;text-transform:uppercase;'}}}
h3{{margin:2.6mm 0 1mm;font:800 5mm/1.2 {font},sans-serif;color:#1F4A37;text-transform:uppercase;letter-spacing:{'0' if rtl else '.5mm'}}}
.row{{display:flex;align-items:baseline;gap:2mm;font-size:4.7mm;line-height:1.48;font-weight:600}}
.dots{{flex:1;border-bottom:.45mm dotted #1A1A1755;transform:translateY(-1.2mm)}}
.price{{font:800 4.7mm 'Plus Jakarta Sans',sans-serif;white-space:nowrap}}
.sizes{{display:flex;flex-wrap:wrap;gap:1mm 2.4mm;margin:.4mm 0 1.4mm}}
.sizes span{{display:inline-flex;gap:1.6mm;align-items:baseline;background:#EFE6D6;border-radius:99mm;padding:.6mm 3mm;font-size:4.1mm}}
.sizes i{{font-style:normal;font-weight:700;color:#1F4A37}}.sizes b{{font-family:'Plus Jakarta Sans';font-weight:800}}
footer{{display:flex;justify-content:space-between;align-items:center;padding:3mm 14mm 5mm;font-size:4.2mm;color:#6B655C;font-weight:600}}
footer b{{color:#C8102E;font:{'400' if rtl else '900'} 6mm/1 {disp},sans-serif}}
</style></head><body><div class="page">
<header><div class="logo">{LOGO}</div>
<div class="mid"><div class="order">{t['order']}</div><div class="url">{SITE}</div><div class="hours">{t['hours']}</div>
<div class="call">{t['call']}: <bdi>{PHONE}</bdi></div></div>
<div class="qr"><div class="box">{QR}</div><p>{t['scan']}</p></div></header>
<main>{cols}</main>
<footer><span>{t['ll']}</span><b>{t['tag']}</b></footer>
</div></body></html>'''

for lang in ('en', 'ar'):
    open(f'menu-a3-{lang}.html', 'w').write(build(lang))
print('ok')
