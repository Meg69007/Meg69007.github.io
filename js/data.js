/* Contenu du portfolio. Source unique : app.js lit window.PORTFOLIO. Ne pas inventer d'autres faits. */
window.PORTFOLIO = {
  identity: {
    name: "Gabriel Megroian",
    role: "Développeur d'applications",
    school: "Epitech Lyon, 3e année",
    pitch: "Je conçois et développe des applications complètes, de l'API à l'interface. Formé à la programmation système et réseau en C et C++, je travaille aujourd'hui sur le web, la cybersécurité et l'intégration de l'IA.",
    status: "Recherche un stage à temps plein, de mars à août 2027"
  },

  domains: [
    { id: "web", label: "Web & full stack" },
    { id: "sys", label: "Systèmes & réseau" },
    { id: "cyber", label: "Cybersécurité" },
    { id: "math", label: "Maths & 3D" },
    { id: "cloud", label: "Cloud & infra" }
  ],

  projects: [
    {
      id: "ticket-tout",
      title: "Ticket Tout",
      domain: "web",
      date: "Septembre 2026",
      context: "Piscine Survivor, Epitech, équipe de 4",
      summary: "Plateforme de carte prépayée pour salariés, avec trois espaces : salarié, partenaire et administration.",
      points: [
        "Paiement par QR code signé côté serveur, à usage unique, valable 5 minutes",
        "Transactions immuables, solde jamais négatif, encaissement idempotent avec un test automatique par règle",
        "Solde et transactions poussés en temps réel par rooms Socket.IO",
        "Authentification JWT avec refresh token haché en base et rotation à chaque renouvellement",
        "Application 100 % locale : monorepo Turborepo, PostgreSQL et services sous Docker Compose"
      ],
      stack: ["Next.js", "NestJS", "TypeScript", "Prisma", "PostgreSQL", "Socket.IO", "Zod", "Docker"]
    },
    {
      id: "saas-internes",
      title: "Applications métier SaaS",
      domain: "web",
      date: "Depuis octobre 2026",
      context: "Temps partiel chez Moontech, en parallèle d'Epitech",
      summary: "Conception et développement de SaaS complets chez Moontech, pour un usage interne à l'entreprise ou proposés à ses clients.",
      points: [
        "Back-end principalement en Laravel, interface en React, JavaScript et Tailwind CSS",
        "Fonctions d'IA intégrées aux outils, par l'API Claude ou par des flux n8n",
        "Connexions à des API tierces et automatisations n8n quand le besoin s'y prête",
        "Applications développées de bout en bout, de la base de données à l'interface"
      ],
      stack: ["Laravel", "React", "JavaScript", "Tailwind CSS", "n8n", "API Claude", "API REST"]
    },
    {
      id: "myftp",
      title: "myFTP",
      domain: "sys",
      date: "Mars 2026",
      context: "Projet Epitech G-NWP-400",
      summary: "Serveur FTP en C conforme à la RFC 959, multi-clients.",
      points: [
        "Multiplexage des connexions avec poll() et transferts de données dans des processus fork()",
        "Tampons d'écriture par client pour ne jamais bloquer la boucle principale",
        "Résolution de chemins protégée contre la traversée de répertoires",
        "Tableau de clients dynamique qui grandit à la demande"
      ],
      stack: ["C", "Sockets", "poll()", "fork()"]
    },
    {
      id: "zappy",
      title: "Zappy",
      domain: "sys",
      date: "",
      context: "Projet Epitech, en groupe",
      summary: "Jeu en réseau composé d'un serveur, d'une interface graphique et d'IA clientes autonomes.",
      points: [
        "Serveur qui gère le monde, les ressources et les joueurs connectés",
        "Protocole réseau entre le serveur, l'interface graphique et les IA",
        "IA clientes qui jouent seules et coopèrent pour faire monter leur équipe de niveau"
      ],
      stack: ["Réseau", "Sockets", "Protocole client-serveur", "IA de jeu"]
    },
    {
      id: "minishell",
      title: "Minishell",
      domain: "sys",
      date: "",
      context: "Projet Epitech",
      summary: "Interpréteur de commandes en C, sur le modèle de tcsh.",
      points: [
        "Analyse syntaxique de la ligne de commande",
        "Pipes et redirections",
        "Commandes internes et gestion des signaux"
      ],
      stack: ["C", "Processus", "Pipes", "Signaux"]
    },
    {
      id: "libc",
      title: "Recodage de la libc",
      domain: "sys",
      date: "",
      context: "Projets Epitech",
      summary: "Réimplémentation en C de printf, ls et top.",
      points: [
        "Gestion manuelle de la mémoire",
        "Appels système directs"
      ],
      stack: ["C", "Appels système", "Gestion mémoire"]
    },
    {
      id: "arcade",
      title: "Arcade",
      domain: "sys",
      date: "Mars 2026",
      context: "Projet Epitech G-OOP-400",
      summary: "Plateforme de jeux en C++ où jeux et moteurs d'affichage sont des bibliothèques dynamiques interchangeables à l'exécution.",
      points: [
        "Interfaces IDisplay et IGame partagées entre les groupes",
        "Trois moteurs d'affichage : nCurses, SDL2 et SFML",
        "En-têtes réduits au strict nécessaire : Tile, Event, IDisplay, IGame"
      ],
      stack: ["C++", "Bibliothèques dynamiques", "nCurses", "SDL2", "SFML"]
    },
    {
      id: "raytracer",
      title: "Raytracer",
      domain: "math",
      date: "Avril à mai 2026",
      context: "Projet Epitech B-FRE-400",
      summary: "Moteur de lancer de rayons en C++ qui rend une scène décrite dans un fichier de configuration.",
      points: [
        "Scène organisée avec le patron Composite",
        "Chargement des scènes avec libconfig",
        "Rapport écrit sur l'architecture et les choix techniques"
      ],
      stack: ["C++", "libconfig", "Algèbre linéaire"]
    },
    {
      id: "interstonar",
      title: "Interstonar",
      domain: "math",
      date: "Mars à avril 2026",
      context: "Projet Epitech G-CNA-400",
      summary: "Simulation gravitationnelle à N corps et rendu par ray marching, en Python sans aucune dépendance. La simulation en haut de cette page reprend le même principe.",
      points: [
        "Intégration d'Euler et fusion des corps pondérée par la masse",
        "Ray marching sur des fonctions de distance signées",
        "Scènes décrites en TOML, bibliothèque standard uniquement"
      ],
      stack: ["Python", "Simulation numérique", "Ray marching", "TOML"]
    },
    {
      id: "my-pgp",
      title: "my_pgp",
      domain: "cyber",
      date: "Octobre 2026, en cours",
      context: "Projet Epitech G-CNA-500, en groupe",
      summary: "Implémentation d'algorithmes de chiffrement, du XOR jusqu'à un schéma hybride de type PGP.",
      points: [
        "Chiffrements symétriques : XOR puis AES",
        "Chiffrement asymétrique RSA",
        "Mode PGP combinant les deux"
      ],
      stack: ["Cryptographie", "AES", "RSA", "PGP"]
    },
    {
      id: "houndlabs",
      title: "Lab Active Directory",
      domain: "cyber",
      date: "Octobre 2026",
      context: "Lab de pentest Epitech, format CTF",
      summary: "Compromission pas à pas d'un domaine Active Directory, avec une chaîne de challenges à flags.",
      points: [
        "Cartographie des chemins d'attaque avec BloodHound",
        "Énumération et mouvements latéraux avec NetExec, impacket et bloodyAD",
        "Cassage de condensats avec hashcat, le tout depuis Exegol"
      ],
      stack: ["Active Directory", "BloodHound", "NetExec", "impacket", "hashcat", "Exegol"]
    },
    {
      id: "juice-shop",
      title: "CTF Hack & Juice",
      domain: "cyber",
      date: "Mars 2026",
      context: "Projet Epitech G-SEC-400",
      summary: "CTF de sécurité web sur OWASP Juice Shop, avec un rapport rédigé pour chaque challenge.",
      points: [
        "Injections SQL et analyse de jetons JWT",
        "Chaînes de recherche OSINT",
        "Secret TOTP retrouvé dans le JavaScript servi au client"
      ],
      stack: ["Sécurité web", "Injection SQL", "JWT", "OSINT"]
    },
    {
      id: "aws-microservices",
      title: "Du monolithe aux microservices",
      domain: "cloud",
      date: "Juin 2026",
      context: "Lab AWS",
      summary: "Découpage d'une application Node.js monolithique en microservices conteneurisés sur AWS.",
      points: [
        "Conteneurisation de chaque service avec Docker",
        "Dépôts CodeCommit et environnement Cloud9",
        "Base de données gérée sur RDS"
      ],
      stack: ["AWS", "Docker", "Node.js", "RDS"]
    }
  ],

  /* Chaque compétence pointe vers les projets qui la prouvent (ids ci-dessus). */
  skills: [
    { group: "Langages", items: [
      { name: "C", projects: ["myftp", "minishell", "libc"] },
      { name: "C++", projects: ["arcade", "raytracer"] },
      { name: "Python", projects: ["interstonar"] },
      { name: "JavaScript / TypeScript", projects: ["ticket-tout", "saas-internes"] },
      { name: "SQL", projects: ["ticket-tout"] },
      { name: "Bash", projects: [] }
    ]},
    { group: "Web", items: [
      { name: "React / Next.js", projects: ["ticket-tout", "saas-internes"] },
      { name: "NestJS", projects: ["ticket-tout"] },
      { name: "Laravel", projects: ["saas-internes"] },
      { name: "Tailwind CSS", projects: ["saas-internes", "ticket-tout"] },
      { name: "n8n et connexions d'API", projects: ["saas-internes"] },
      { name: "PostgreSQL / Prisma", projects: ["ticket-tout"] },
      { name: "Temps réel (Socket.IO)", projects: ["ticket-tout"] }
    ]},
    { group: "Systèmes & réseau", items: [
      { name: "Sockets, processus, signaux", projects: ["myftp", "zappy", "minishell"] },
      { name: "Appels système, gestion mémoire", projects: ["libc", "minishell"] },
      { name: "Bibliothèques dynamiques", projects: ["arcade"] },
      { name: "Administration Linux / Windows", projects: [] },
      { name: "Proxmox, VMware, VPN", projects: [] },
      { name: "Cisco, Fortinet, Ubiquiti", projects: [] }
    ]},
    { group: "Cybersécurité", items: [
      { name: "Pentest Active Directory", projects: ["houndlabs"] },
      { name: "Sécurité web", projects: ["juice-shop", "ticket-tout"] },
      { name: "Cryptographie", projects: ["my-pgp"] },
      { name: "Ghidra, Burp Suite, Wireshark", projects: [] }
    ]},
    { group: "IA, cloud & outils", items: [
      { name: "Intégration d'IA (API Claude, n8n)", projects: ["saas-internes"] },
      { name: "Docker", projects: ["ticket-tout", "aws-microservices"] },
      { name: "AWS", projects: ["aws-microservices"] },
      { name: "Git, CI/CD (GitHub Actions)", projects: [] },
      { name: "gdb, valgrind, strace", projects: [] },
      { name: "Simulation numérique", projects: ["interstonar", "raytracer"] }
    ]}
  ],

  /* Du plus récent au plus ancien. */
  timeline: [
    { period: "Depuis octobre 2026", title: "Développeur à temps partiel", place: "Moontech, en parallèle d'Epitech",
      text: "Développement d'applications métier SaaS, pour l'entreprise ou pour ses clients, principalement en Laravel, avec React, Tailwind CSS, des connexions d'API, n8n et de l'IA intégrée par l'API Claude." },
    { period: "Août à décembre 2025", title: "Technicien et développeur", place: "UP IT",
      text: "Scripts d'automatisation, administration de machines virtuelles et de serveurs Proxmox, VPN, bases de données, gestion du parc réseau (pare-feu, serveurs, switchs, routeurs) et relation client." },
    { period: "Promotion 2029", title: "Programme Grande École", place: "Epitech Lyon",
      text: "Actuellement en 3e année. Projets en C, C++ et Python, réseau, sécurité et mathématiques appliquées." },
    { period: "2021 à 2022", title: "Année préparatoire à la médecine", place: "Mediplus",
      text: "Année de préparation intensive aux études de médecine. J'y ai acquis une méthode de travail rigoureuse et l'habitude d'assimiler vite de gros volumes de connaissances, que j'applique aujourd'hui à l'informatique." }
  ],

  /* Liens à renseigner par Gabriel. href vide = afficher l'entrée comme « à renseigner ». */
  contact: [
    { label: "E-mail", value: "gabriel.megroian@epitech.eu", href: "mailto:gabriel.megroian@epitech.eu" },
    { label: "GitHub", value: "github.com/Meg69007", href: "https://github.com/Meg69007" },
    { label: "LinkedIn", value: "linkedin.com/in/gabriel-megroian", href: "https://www.linkedin.com/in/gabriel-megroian" }
  ]
};
