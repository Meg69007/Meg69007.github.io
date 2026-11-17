#!/bin/sh
# Regroupe et minifie les sources dans css/site.min.css et js/site.min.js,
# puis met à jour le numéro de version des fichiers dans index.html.
# Usage : ./build.sh   (nécessite Node.js ; esbuild est récupéré par npx)
set -e
cd "$(dirname "$0")"
ESBUILD="${ESBUILD:-npx --yes esbuild@0.25.0}"

cat css/fonts.css css/site.css css/transitions.css | $ESBUILD --loader=css --minify > css/site.min.css

: > js/site.min.js
for f in data visuals-a visuals-b visuals-c visuals-d app sim; do
  $ESBUILD --minify "js/$f.js" >> js/site.min.js
  printf '\n;' >> js/site.min.js
done
for f in gsap.min ScrollTrigger.min lenis.min; do
  cat "js/vendor/$f.js" >> js/site.min.js
  printf '\n;' >> js/site.min.js
done
$ESBUILD --minify js/transitions.js >> js/site.min.js

V=$(date +%Y%m%d%H%M)
sed -i.bak -E "s/\?v=[0-9]+\"/?v=$V\"/g" index.html && rm -f index.html.bak
echo "Version $V"
