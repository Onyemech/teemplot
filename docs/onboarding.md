Navbar.tsx:42 
 A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <LoadingBoundary loading={null}>
      <HTTPAccessFallbackBoundary notFound={<SegmentViewNode>} forbidden={undefined} unauthorized={undefined}>
        <HTTPAccessFallbackErrorBoundary pathname="/" notFound={<SegmentViewNode>} forbidden={undefined} ...>
          <RedirectBoundary>
            <RedirectErrorBoundary router={{...}}>
              <InnerLayoutRouter url="/" tree={[...]} cacheNode={{lazyData:null, ...}} segmentPath={[...]}>
                <SegmentViewNode type="page" pagePath="/Saas/teem...">
                  <SegmentTrieNode>
                  <Home>
                    <main className="min-h-screen">
                      <Navbar>
                        <nav className="fixed top-...">
                          <div className="max-w-7xl ...">
                            <div className="flex items...">
                              <LinkComponent href="/" className="flex items...">
                                <a
                                  className="flex items-center space-x-2 group"
                                  ref={function}
                                  onClick={function onClick}
                                  onMouseEnter={function onMouseEnter}
                                  onTouchStart={function onTouchStart}
                                  href="/"
-                                 rtrvr-listeners="drag,dragend,dragstart"
                                >
                              <div className="hidden md:...">
                                <a
                                  href="#features"
                                  className="text-foreground/80 hover:text-accent font-medium transition-all duration-..."
-                                 rtrvr-listeners="drag,dragend,dragstart"
                                >
                                <a
                                  href="#benefits"
                                  className="text-foreground/80 hover:text-accent font-medium transition-all duration-..."
-                                 rtrvr-listeners="drag,dragend,dragstart"
                                >
                                <a
                                  href="#pricing"
                                  className="text-foreground/80 hover:text-accent font-medium transition-all duration-..."
-                                 rtrvr-listeners="drag,dragend,dragstart"
                                >
                                <a
                                  href="#contact"
                                  className="text-foreground/80 hover:text-accent font-medium transition-all duration-..."
-                                 rtrvr-listeners="drag,dragend,dragstart"
                                >
                              <div className="hidden md:...">
                                <LinkComponent href="/onboardin..." prefetch={true} className="text-foreg...">
                                  <a
                                    className="text-foreground hover:text-accent px-4 py-2 transition-colors"
                                    ref={function}
                                    onClick={function onClick}
                                    onMouseEnter={function onMouseEnter}
                                    onTouchStart={function onTouchStart}
                                    href="/onboarding/register"
-                                   rtrvr-listeners="drag,dragend,dragstart"
                                  >
+                                   Sign In
                                <LinkComponent href="/onboardin..." prefetch={true} className="bg-[#0F5D5...">
                                  <a
                                    className="bg-[#0F5D5D] text-white px-6 py-2 rounded-lg hover:bg-[#093737] hover:s..."
                                    ref={function}
                                    onClick={function onClick}
                                    onMouseEnter={function onMouseEnter}
                                    onTouchStart={function onTouchStart}
                                    href="/onboarding/register"
-                                   rtrvr-listeners="drag,dragend,dragstart"
                                  >
+                                   Get Started
Navbar.tsx:43 
 Image with src "/logo.png" has either width or height modified, but not the other. If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.