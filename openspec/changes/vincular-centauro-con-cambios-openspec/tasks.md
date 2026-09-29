# Tasks

Lista de resultados y comprobaciones pendientes. Referencias de implementación en [execution.md](execution.md).

## 1. Datos e historial

- [ ] 1.1 **Orquestador/auditor:** Definir precedencia de decisión SQL/notas JSON y esquema portable de origen. **Comprobación:** Contrato evita doble fuente; decisiones históricas ambiguas quedan identificadas.
- [ ] 1.2 **IA local:** Agregar migración de relaciones idea/change y eventos de reversión. **Comprobación:** Migración repetida conserva decisiones y relaciones; fallo no destruye respaldo.
- [ ] 1.3 **IA local:** Unificar lectura de decisión vigente en historial y feedback. **Comprobación:** Deshacer y reabrir muestra mismo estado en SQL, notas y UI; fallos quedan recuperables.

## 2. Conexión con SDD

- [ ] 2.1 **IA local:** Preparar creación de propuesta desde idea con referencia portable. **Comprobación:** Aceptar idea solo no escribe OpenSpec; propuesta muestra objetivo y origen antes de crear.
- [ ] 2.2 **IA local:** Conectar Crear propuesta y evitar duplicación por reintento. **Comprobación:** Doble envío abre mismo resultado o informa pendiente sin crear dos cambios.
- [ ] 2.3 **IA local:** Agregar Vincular existente y navegación entre idea, cambio y rama. **Comprobación:** Detecta destino inexistente, retirado y de otro repo; clone sin SQL conserva origen del documento.
- [ ] 2.4 **IA local:** Resolver convivencia con materialización actual de rama imaginada. **Comprobación:** Materializar no crea OpenSpec ni hace checkout oculto; conflicto exige destino explícito.
- [ ] 2.5 **IA local:** Corregir rótulos de métricas y separar decisión de resultado técnico. **Comprobación:** Aceptar/materializar no se describe como implementación exitosa; ambos accesos al dashboard siguen funcionando.

## 3. Aceptación

- [ ] 3.1 **Orquestador/auditor:** Auditar idea→propuesta→cambio→origen con historial real y datos ambiguos. **Comprobación:** Verificar reintento, fallo SQL, deshacer, clone y navegación en Centauro; revisión visual con Alejandro.
