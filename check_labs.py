"""Browser checks for meaningful lab outcomes and responsive navigation."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).parent/'dist'
with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':1280,'height':900})
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    # Avoid relying on external playback while checking the local course.
    page.route('https://www.youtube-nocookie.com/**',lambda route: route.abort())
    def go(name): page.goto((root/name).as_uri(),wait_until='domcontentloaded')
    def expect(selector, text):
        page.wait_for_function('(args) => document.querySelector(args[0]).textContent.includes(args[1])',arg=[selector,text])
    go('index.html')
    page.select_option('#goal','Integrity'); page.click('#incident-check'); expect('#incident-result','Try again')
    page.select_option('#goal','Confidentiality'); page.click('#incident-check'); expect('#incident-result','Correct')
    go('module-2.html')
    page.select_option('#record','102'); page.click('#request-record'); expect('#access-result','SECURITY FLAW')
    page.select_option('#policy','owner'); page.click('#request-record'); expect('#access-result','ACCESS DENIED')
    page.select_option('#record','101'); page.click('#request-record'); expect('#access-result','ACCESS ALLOWED')
    go('module-3.html')
    page.click('#decrypt'); expect('#crypto-result','first')
    page.click('#encrypt'); expect('#crypto-result','Encrypted with')
    first=page.locator('#crypto-result').inner_text()
    page.click('#decrypt'); expect('#crypto-result','Class starts at 7.')
    page.click('#tamper'); page.click('#decrypt'); expect('#crypto-result','Authentication failed')
    page.click('#encrypt'); expect('#crypto-result','Encrypted with')
    assert page.locator('#crypto-result').inner_text()!=first,'Nonce should differ'
    go('module-4.html')
    page.click('#sign'); expect('#signature-result','Announcement signed')
    page.click('#verify'); expect('#signature-result','VALID SIGNATURE')
    page.fill('#announcement','Class starts at 9.'); page.click('#verify'); expect('#signature-result','INVALID SIGNATURE')
    page.fill('#announcement','Class starts at 7.'); page.click('#verify'); expect('#signature-result','VALID SIGNATURE')
    go('module-5.html')
    page.click('#review-plan'); expect('#plan-result','Complete the')
    page.fill('#treatment','Restore a sample backup in isolation and check records.')
    page.fill('#owner','Operations lead'); page.fill('#evidence','Restore report with timing and integrity checks.')
    page.fill('#deadline','91'); page.click('#review-plan'); expect('#plan-result','Complete the')
    page.fill('#deadline','14'); page.click('#review-plan'); expect('#plan-result','ready for human review')
    # Verify five pages at desktop and mobile widths without horizontal content overflow.
    for width in [1280,390]:
        page.set_viewport_size({'width':width,'height':844})
        for name in ['index.html','module-2.html','module-3.html','module-4.html','module-5.html']:
            go(name)
            assert page.locator('h1').count()==1
            assert page.locator('[aria-current="page"]').count()==1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),f'Overflow: {name} at {width}'
    page.screenshot(path=str(Path(__file__).parent/'course-mobile.png'),full_page=False)
    assert not errors, errors
    browser.close()
print('PASS: incident feedback, permission flaw/repair, AES-GCM round trip/tampering, signature changes, plan validation, all pages at desktop/mobile, no script errors.')
