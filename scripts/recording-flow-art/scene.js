// Shared by hero.html and g1.html: the art arrives as two clusters, pinned to
// their own bottom corners and sized by height (?scale=, a % of the frame).
const q = new URLSearchParams(location.search);
const root = document.body.style;
root.setProperty('--left', 'url(art-left.png)');
root.setProperty('--right', 'url(art-right.png)');
root.setProperty('--scale', (q.get('scale') ?? '62') + '%');
if (q.get('ground')) root.setProperty('--ground', '#' + q.get('ground'));
