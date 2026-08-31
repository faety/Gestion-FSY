# Décisions d'orientation

Les choix arrêtés par le couple dirigeant qui engagent l'avenir du projet,
au-delà d'une session de travail. Une ligne de contexte, la décision, sa date.

## Multi-coordinations : isolation par sous-domaine (29 août 2026)

La plateforme a servi la conférence FSY 2026 de la coordination Abidjan
Ouest. La Côte d'Ivoire compte plusieurs coordinations (au moins Abidjan
Nord, Sud, Est, Ouest — et d'autres), et l'ambition est de leur ouvrir la
plateforme, chacune avec son couple dirigeant et son staff.

**Décision de Bérenger Dahakpoin : quand ce chantier s'ouvrira, chaque
coordination aura son déploiement isolé sous son propre sous-domaine**
(`nord.fsy.ci`, `sud.fsy.ci`, …) — même code, mais base de données, compte
Cloudinary et variables d'environnement séparés par coordination. Pas de base
commune multi-tenant.

Motifs : l'isolation réelle des données de mineurs (dossiers médicaux,
contacts des familles — une erreur chez l'un ne peut pas exposer les jeunes
d'un autre, et personne ne voit au-delà de sa coordination) ; aucun grand
refactor du code, qui suppose partout une seule conférence ; monter une
coordination devient une procédure d'installation, pas un développement.

Points d'attention le jour venu :
- le caractère générique `*.fsy.ci` résout déjà tous les sous-domaines ;
  chaque nouveau domaine reste à déclarer dans son projet Vercel ;
- ne jamais rien créer SOUS un sous-domaine actif (pas de `send.nord...`,
  pas de `_dmarc`) : un nœud vide sort le nom du générique (RFC 4592) —
  c'est ainsi que `2026.fsy.ci` avait disparu ;
- écrire la procédure d'installation d'une coordination (base Neon, seed,
  variables, domaine) pour qu'elle tienne en une heure.

Le calendrier : après la saison, à froid. Rien n'est engagé tant que le
couple ne relance pas le chantier.
