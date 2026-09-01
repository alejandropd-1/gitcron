Trabajas en C:\www\gitCronos, rama change/automatizar-las-tandas-de-migracion.
PASO 2-A de 7: ANALIZAR. **Este paso no edita ningun archivo.**

-- QUE CLASE DE TRABAJO ES ESTE --
Medir y decidir. Corres los comandos que necesites, mirás lo que encontrás, y entregás
un informe. **No edites nada**: la implementacion es el paso siguiente, y va a usar
este informe como insumo.

-- EL PROBLEMA A RESOLVER --
El detector de i18n —`scripts/deteccion/i18n.mjs`, 170 lineas— encuentra el texto de
interfaz que esta en el JSX: entre tags, en atributos, en ternarios. **No ve las
strings que se pasan como argumento a una funcion.**

Ahi viven casi todos los mensajes de error de la aplicacion, y hoy estan escritos a
mano en castellano, asi que un usuario en ingles o en chino los ve en castellano.

Tu trabajo es medir cuantos hay, de que tipo, y decidir cuales son deuda de verdad.

-- POR DONDE EMPEZAR --
Leé primero `scripts/deteccion/i18n.mjs` entero: son unos 4.500 tokens y necesitás
saber como esta armado, que patrones ya tiene, que excluye y por que. Cada comentario
de ese archivo explica una trampa que costo una tanda descubrir.

Despues buscá en el proyecto. Vos elegis como: `grep`, `findstr`, `node -e`, lo que te
sirva. **No leas componentes enteros** — son grandes y no hace falta: buscá y mirá las
lineas que salgan.

-- LAS PREGUNTAS QUE TIENE QUE CONTESTAR TU INFORME --

1. **¿Que funciones reciben texto de interfaz?** `setError` y `throw new Error` son
   dos seguras. Buscá si hay otras: avisos, mensajes de estado, toasts. Entregá el
   conjunto que proponés, con cuantos casos tiene cada una.

2. **¿Cuantas de esas llamadas tienen una string escrita a mano, y cuantas ya pasan
   por `t(...)`?** Las segundas no son deuda: ya estan bien. Si el patron nuevo las
   cuenta, el numero se infla al doble y la medicion no sirve. Dá los dos numeros por
   separado y decí con que comando los sacaste.

3. **¿Cuales de las escritas a mano son texto que una persona lee, y cuales son
   codigos internos?** Vas a encontrar las dos cosas. Un codigo interno no se traduce.

4. **¿Entra `lib/` en la cobertura?** El detector recorre hoy solo `components/` y
   `app/`. Si encontrás mensajes de interfaz fuera de esos dos directorios, decilo y
   proponé si el detector tiene que ampliarse o no. Hay argumentos para los dos lados:
   decidí y fundamentá.

5. **¿Una string en ingles dentro de un `throw` es deuda de interfaz, o es un error de
   programador que nadie traduce?** Mirá los casos concretos que encuentres antes de
   contestar.

6. **¿Como serian el patron y el ancla?** Proponé la expresion regular y decí que
   emitiria como `ancla` — el fragmento que un ejecutor buscaria despues para ubicar
   la edicion. Fijate como resuelven el ancla los patrones que ya estan.

-- LO QUE NO TENES QUE HACER --
- No edites ningun archivo. Ni el detector, ni un componente, ni `lib/i18n.ts`.
- No migres ninguna string.
- No escribas el patron en el codigo: escribilo en el informe.
- Ningun comando Git que no sea de lectura.

-- CUANDO PARAR --
- Si encontrás algo que cambia el planteo —por ejemplo, que la mayoria ya usa `t()` y
  la deuda real es chica— decilo y parà: puede que este paso cambie el plan.

-- QUE ENTREGAR --
Un informe corto, con numeros medidos por vos y el comando con que los sacaste:

1. El conjunto de funciones que proponés, con cuantos casos cada una.
2. Cuantas escritas a mano y cuantas ya con `t()`.
3. La lista de las escritas a mano: archivo, linea y el texto. Si son mas de treinta,
   dá las primeras treinta y el total.
4. Tu decision sobre las preguntas 3, 4 y 5, con el fundamento en una linea cada una.
5. El patron propuesto y que emitiria como ancla.
6. Cuanto esperás que suba el numero del detector, que hoy es **69 en 24 archivos**.

PARA ACA. La implementacion es el paso siguiente.
