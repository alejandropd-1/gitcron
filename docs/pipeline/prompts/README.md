# Pipeline — Prompts de ejecución

Esta carpeta contiene el prompt de arranque autónomo de cada fase. Se separa el encargo del reporte:

- `docs/pipeline/prompts/`: instrucciones antes de ejecutar;
- `docs/pipeline/briefs/fase-*.md`: brief técnico y fuente de alcance;
- `docs/reports/YYYY-MM-DD-pipeline-fase-NN-<slug>.md`: evidencia después de ejecutar;
- `docs/pipeline/00-estado-track.md`: estado resumido del programa.

Cada prompt incluye contexto, decisiones que no se deben volver a preguntar, rama, gates,
entregables, acciones humanas y cierre. El detalle técnico vive en el brief para evitar duplicación y
drift. Si prompt y brief difieren, el agente se detiene y pide dirección.

No ejecutar dos prompts de fase simultáneamente sobre el mismo working tree.
