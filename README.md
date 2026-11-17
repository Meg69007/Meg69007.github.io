# Portfolio de Gabriel Megroian

Site statique (HTML, CSS, JavaScript), publié avec GitHub Pages : https://meg69007.github.io

## Organisation

- `index.html` : la page. Elle charge deux fichiers générés, `css/site.min.css` et `js/site.min.js`.
- `js/data.js` : tout le contenu (projets, compétences, parcours, contact). C'est le fichier à modifier pour mettre le site à jour.
- `css/site.css`, `css/transitions.css`, `css/fonts.css` : sources des styles.
- `js/app.js` (interface), `js/sim.js` (simulation de l'accueil), `js/transitions.js` (animations au défilement), `js/visuals-*.js` (visuels des projets) : sources des scripts.
- `js/vendor/` : GSAP, ScrollTrigger et Lenis, embarqués.
- `fonts/` : polices embarquées (Bricolage Grotesque, Instrument Sans, Martian Mono, licence SIL OFL 1.1).

## Après une modification

Les sources ne sont pas chargées directement par la page. Après avoir modifié un fichier de `css/` ou de `js/`, régénérer les fichiers minifiés :

```sh
./build.sh
```

Le script demande Node.js. Il regroupe et minifie les sources, puis met à jour le numéro de version des fichiers dans `index.html` pour que les visiteurs reçoivent la nouvelle version.
