// JSON-LD helpers shared by the page build. Breadcrumbs stay in the graph
// so the visible page layout does not move.

export function breadcrumbList(site, canonical, crumb) {
  if (!canonical || !crumb) return null;
  let path = canonical.startsWith(site) ? canonical.slice(site.length) : canonical;
  if (!path.startsWith("/")) path = `/${path}`;
  if (!path.endsWith(".html") && !path.endsWith("/")) path = `${path}/`;
  if (path === "/") return null;
  const items = [{ name: "Home", item: `${site}/` }];
  if (path.startsWith("/articles/") && path !== "/articles/") {
    items.push({ name: "Articles", item: `${site}/articles/` });
  } else if (path.startsWith("/techniques/") && path !== "/techniques/") {
    items.push({ name: "Techniques", item: `${site}/techniques/` });
  }
  items.push({ name: crumb, item: `${site}${path}` });
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
}

export function articleImage(site, image) {
  if (!image?.src) return null;
  const url = /^https?:\/\//.test(image.src)
    ? image.src
    : `${site}${image.src.startsWith("/") ? image.src : `/${image.src}`}`;
  const node = { "@type": "ImageObject", url };
  if (image.width) node.width = Number(image.width);
  if (image.height) node.height = Number(image.height);
  return node;
}
