# -*- coding: utf-8 -*-
"""
Playwright smoke tests for space-dan blog.
Covers: navigation, posts, bulletin, games accordion, CatchGame fix.
"""
import sys, os
os.environ["PYTHONIOENCODING"] = "utf-8"

from playwright.sync_api import sync_playwright

BASE  = "http://localhost:5173"
SHOTS = "C:/Users/USUARIO/space-dan/test_screenshots"
os.makedirs(SHOTS, exist_ok=True)

PASS = []
FAIL = []

def ok(name):
    PASS.append(name)
    print(f"  [OK]  {name}")

def fail(name, reason):
    FAIL.append((name, reason))
    print(f"  [FAIL] {name}: {reason}")

def shot(page, name):
    path = f"{SHOTS}/{name}.png"
    page.screenshot(path=path, full_page=False)
    print(f"         screenshot -> {path}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx  = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()

    # -- 1. Welcome / entry page -----------------------------------------
    print("\n-- 1. Welcome page --")
    try:
        page.goto(BASE)
        page.wait_for_load_state("networkidle")
        shot(page, "01_welcome")

        enter_btn = page.locator("button").filter(has_text="entrar")
        sidebar   = page.locator(".sideTitle, .gardenSidebar").first

        if enter_btn.count() > 0 and enter_btn.first.is_visible():
            ok("welcome page renders with enter button")
        elif sidebar.is_visible():
            ok("welcome page (already past entry - sidebar visible)")
        else:
            fail("welcome page", "no enter button or sidebar found")
    except Exception as e:
        fail("welcome page", str(e))

    # -- 2. Navigate into main layout ------------------------------------
    print("\n-- 2. Main layout --")
    try:
        enter_btn = page.locator("button").filter(has_text="entrar")
        if enter_btn.count() > 0 and enter_btn.first.is_visible():
            enter_btn.first.click()
            page.wait_for_load_state("networkidle")

        shot(page, "02_main_layout")
        sidebar = page.locator(".gardenSidebar, .sideTitle").first
        if sidebar.is_visible():
            ok("main layout sidebar visible")
        else:
            fail("main layout", "sidebar not found after entering")
    except Exception as e:
        fail("main layout", str(e))

    # -- 3. Posts page ---------------------------------------------------
    print("\n-- 3. Posts page --")
    try:
        page.goto(f"{BASE}/posts")
        page.wait_for_load_state("networkidle")
        shot(page, "03_posts_page")

        search = page.locator(".searchInput")
        if search.count() > 0 and search.first.is_visible():
            ok("posts: search input rendered")
        else:
            fail("posts: search input", "not found")

        tags = page.locator(".tagPill")
        if tags.count() > 0:
            ok(f"posts: tag pills rendered ({tags.count()} tags)")
        else:
            fail("posts: tag pills", "none found")

        archive = page.locator(".archiveWidget")
        if archive.count() > 0 and archive.first.is_visible():
            ok("posts: date archive widget rendered")
        else:
            fail("posts: archive widget", "not found")

        cards = page.locator(".postCard")
        if cards.count() > 0:
            ok(f"posts: {cards.count()} post card(s) rendered")
        else:
            fail("posts: post cards", "none found")

        like_btns = page.locator(".likeBtn")
        if like_btns.count() > 0:
            ok(f"posts: {like_btns.count()} like button(s) rendered")
        else:
            fail("posts: like button", "not found")

    except Exception as e:
        fail("posts page", str(e))

    # -- 4. Search filter ------------------------------------------------
    print("\n-- 4. Posts search --")
    try:
        page.goto(f"{BASE}/posts")
        page.wait_for_load_state("networkidle")

        search = page.locator(".searchInput").first
        search.fill("primer")
        page.wait_for_timeout(300)
        shot(page, "04_posts_search")

        cards_after = page.locator(".postCard")
        if cards_after.count() >= 1:
            ok(f"posts: search 'primer' returns {cards_after.count()} result(s)")
        else:
            fail("posts: search filter", "no results for 'primer'")

        search.fill("xyznoexiste123")
        page.wait_for_timeout(300)
        no_match = page.locator(".tinyText").filter(has_text="coincidan")
        if no_match.count() > 0:
            ok("posts: empty search shows 'no coincidan' message")
        else:
            fail("posts: empty-search message", "not found")

    except Exception as e:
        fail("posts search", str(e))

    # -- 5. Post detail (PostPage) ---------------------------------------
    print("\n-- 5. Post detail page --")
    try:
        page.goto(f"{BASE}/posts/1")
        page.wait_for_load_state("networkidle")
        shot(page, "05_post_detail")

        title = page.locator(".card h1").first
        if title.is_visible():
            ok(f"post detail: title visible - '{title.text_content().strip()[:30]}'")
        else:
            fail("post detail: title", "not visible")

        content_ps = page.locator(".markdownContent p")
        if content_ps.count() > 0:
            ok(f"post detail: markdown rendered ({content_ps.count()} paragraphs)")
        else:
            fail("post detail: markdown", "no <p> inside .markdownContent")

        like_btn = page.locator(".likeBtn").first
        if like_btn.is_visible():
            ok("post detail: like button visible")
        else:
            fail("post detail: like button", "not found")

        tag_chips = page.locator(".pageHeader .postCardTag")
        if tag_chips.count() > 0:
            ok(f"post detail: {tag_chips.count()} tag chip(s) in header")
        else:
            fail("post detail: tags", "none in header")

        page.wait_for_timeout(1500)
        views = page.locator(".postViews")
        if views.count() > 0:
            txt = views.text_content().strip().encode("ascii", "replace").decode()
            ok(f"post detail: view counter exists ('{txt}')")
        else:
            fail("post detail: view counter", ".postViews not in DOM")

        back = page.locator(".backLink").first
        if back.is_visible():
            ok("post detail: back link present")
        else:
            fail("post detail: back link", "not found")

    except Exception as e:
        fail("post detail page", str(e))

    # -- 6. Bulletin page -----------------------------------------------
    print("\n-- 6. Bulletin page --")
    try:
        page.goto(f"{BASE}/bulletin")
        page.wait_for_load_state("networkidle")
        shot(page, "06_bulletin")

        search = page.locator(".searchInput").first
        if search.is_visible():
            ok("bulletin: search input visible")
        else:
            fail("bulletin: search input", "not found")

        tags = page.locator(".tagPill")
        if tags.count() > 0:
            ok(f"bulletin: {tags.count()} tag pills")
        else:
            fail("bulletin: tag pills", "none found")

        entries = page.locator(".bulletinEntry")
        initial_count = entries.count()
        if initial_count > 0:
            ok(f"bulletin: {initial_count} entries visible (paginated to {initial_count})")
        else:
            fail("bulletin: entries", "none found")

        load_more = page.locator(".loadMoreBtn")
        if load_more.count() > 0 and load_more.first.is_visible():
            load_more.first.click()
            page.wait_for_timeout(300)
            after = page.locator(".bulletinEntry").count()
            if after > initial_count:
                ok(f"bulletin: 'load more' works ({initial_count} -> {after} entries)")
            else:
                fail("bulletin: load more", f"count didn't increase ({initial_count})")
        else:
            ok("bulletin: no 'load more' button (all entries already shown)")

    except Exception as e:
        fail("bulletin page", str(e))

    # -- 7. Games page - accordion + CatchGame fix ----------------------
    print("\n-- 7. Games page --")
    try:
        page.goto(f"{BASE}/games")
        page.wait_for_load_state("networkidle")
        shot(page, "07_games_page")

        sections = page.locator(".shSection")
        count = sections.count()
        if count >= 20:
            ok(f"games: {count} game sections in accordion")
        else:
            fail("games: accordion sections", f"only {count} found (expected >= 20)")

        # Open CatchGame to verify the bug is fixed
        catch_header = page.locator(".shHeader").filter(has_text="catch game")
        if catch_header.count() > 0:
            catch_header.first.click()
            page.wait_for_timeout(800)
            shot(page, "07b_catch_game_open")

            canvas = page.locator("canvas").first
            if canvas.is_visible():
                ok("games: CatchGame opens and canvas renders (crash FIXED)")
            else:
                fail("games: CatchGame canvas", "canvas not visible after opening")

            # Check no JS errors on the page
            js_errors: list[str] = []
            page.on("pageerror", lambda e: js_errors.append(str(e)))
            page.wait_for_timeout(500)
            if not js_errors:
                ok("games: no JS errors after opening CatchGame")
            else:
                msg = "; ".join(js_errors[i] for i in range(min(2, len(js_errors))))
                fail("games: JS errors", msg)
        else:
            fail("games: CatchGame header", "could not find 'catch game' section")

    except Exception as e:
        fail("games page", str(e))

    # -- 8. Mobile viewport ---------------------------------------------
    print("\n-- 8. Mobile responsiveness --")
    try:
        mob = browser.new_context(viewport={"width": 390, "height": 844})
        mobile_page = mob.new_page()
        mobile_page.goto(f"{BASE}/posts")
        mobile_page.wait_for_load_state("networkidle")
        shot(mobile_page, "08_mobile_posts")

        search = mobile_page.locator(".searchInput").first
        if search.is_visible():
            ok("mobile: posts search input visible at 390px")
        else:
            fail("mobile: search input", "not visible at 390px")

        cards = mobile_page.locator(".postCard")
        if cards.count() > 0:
            ok(f"mobile: {cards.count()} post card(s) visible at 390px")
        else:
            fail("mobile: post cards", "none visible at 390px")

        mob.close()
    except Exception as e:
        fail("mobile", str(e))

    browser.close()

# -- Summary -----------------------------------------------------------
sep = "=" * 54
print(f"\n{sep}")
print(f"  PASSED: {len(PASS)}   FAILED: {len(FAIL)}")
print(sep)
if FAIL:
    print("\nFailed tests:")
    for name, reason in FAIL:
        print(f"  * {name}: {reason}")
    print()

sys.exit(0 if not FAIL else 1)
