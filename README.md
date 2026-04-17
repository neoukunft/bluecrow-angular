# 1. BlueCrow Layout Engine 🐦‍⬛

**BlueCrow** é uma engine de layout pragmática e ultra-performática para Angular, projetada para resolver o caos do posicionamento espacial em sistemas de design complexos.

Ao contrário de frameworks CSS tradicionais, o BlueCrow trata o layout como uma **camada de infraestrutura programável**, separando o "onde as coisas estão" de "como as coisas se parecem".

## 2. 🌟 Possibilidades Estratégicas

A arquitetura BlueCrow abre portas para padrões de UX que antes eram complexos ou custosos:

* `Micro-Layouts Reais (Widget Isolation)`: Componentes tornam-se 100% agnósticos ao contexto. Um widget de "Gráfico" pode se comportar como uma lista em uma sidebar (300px) ou como um painel expandido no centro (1200px) sem uma única Media Query de tela.

* `Layout-as-a-Service`: Comunicação visual entre componentes distantes via Registry. Qualquer parte da aplicação pode solicitar mudanças no BoxModel ou Grid de outro container de forma reativa e tipada.

* `Transições Estruturais Dinâmicas`: Facilita a implementação de estados de "Loading/Skeleton" ou "Sidebar Collapse" apenas reconfigurando o Signal de layout, garantindo que a estrutura mude de forma coordenada.

## 3. 🏗️ A Arquitetura das 3 Camadas

O projeto resolve o problema do **Atomic Design** através da separação de domínios espaciais:

1.  **Camada de Estrutura (Grid):** Gerenciada pela classe `BlueCrowLayout`. Define as massas críticas (Main, Section, Content) usando CSS Grid.
2.  **Camada de Lógica (Widgets):** Agrupamentos funcionais que utilizam Flexbox para gerenciar a relação e o fluxo entre componentes.
3.  **Camada de Apresentação (Componentes):** Átomos puros e "burros" que apenas renderizam UI, sem conhecimento de margens externas ou posicionamento global.

## 4. 🚀 Recursos Principais

* **Container-First Responsiveness:** Responsividade baseada no tamanho do próprio container (via `ResizeObserver`), não na viewport.
* **Signal-Based Registry:** Acesso reativo a qualquer instância de layout de qualquer lugar da aplicação.
* **Dynamic Grid Areas:** Controle granular de áreas (`column`/`row`) via atributos `data-area`, permitindo que componentes se movam na grid dinamicamente.
* **Zero Memory Leak:** Gestão rigorosa do ciclo de vida com limpeza automática de Observers e referências do DOM no `ngOnDestroy`.
* **Hybrid Box Model:** Abstração simplificada de eixos (`axisX`, `axisY`) que mapeia automaticamente para `align-content` ou `align-items`.

---

## 5. Problemas que Corrigimos (via StackOverflow/Research)

Problemas clássicos que nossa engine evita preventivamente:

* A. **O Erro "ExpressionChangedAfterItHasBeenCheckedError"**

    `Problema Comum`: No StackOverflow, muitos desenvolvedores sofrem com esse erro ao tentar mudar o layout baseado no tamanho do DOM durante o ciclo de vida do Angular.

    `Nossa Solução`: Ao usar Signals e atualizar o estado via ResizeObserver (que roda em uma microtask separada), nós "pulamos" o ciclo de checagem síncrona, garantindo que o Angular aceite a mudança de estado sem quebrar a renderização.

* B. **Vazamento de Memória (Resize/Mutation Observers)**

    `Problema Comum`: Iniciantes esquecem de chamar .disconnect(). Em SPAs, isso acumula milhares de observers "fantasmas" que tentam atualizar elementos que nem existem mais.

    `Nossa Solução`: A centralização no destroy() da classe + o unregisterLayout() no ngOnDestroy da diretiva cria um "caixão" seguro para a instância. Se o elemento sai do DOM, o código morre com ele.

* C. **Especificidade de Grid-Areas**

    `Problema Comum`: No CSS puro, grid-template-areas é rígido. Mudar a posição de um item exige reescrever a string inteira no CSS.

    `Nossa Solução`: Seu método setArea usa CSS Variables (--area-col). Isso permite mudar a posição de um único componente sem afetar os outros e sem precisar tocar em arquivos .css ou .scss.

* D. **Conflitos de Seletor em Componentes Dinâmicos**

    `Problema Comum`: Quando você tem 5 instâncias do mesmo componente na tela, IDs e classes CSS globais se atropelam.

    `Nossa Solução`: O uso de data-area dentro do escopo da instância (this.layout.querySelectorAll) garante que o BlueCrow só mexa nos filhos daquele container específico. É um encapsulamento de estilo via JS.

---

## 6. 🛠️ Como Funciona

### 1. Definindo a Estrutura (HTML)
Use a diretiva `blueCrowLayout` para transformar qualquer elemento em um nó inteligente.

```html
<main [blueCrowLayout]="'main-grid'">
  <aside data-area="sidebar"></aside>
  <section data-area="content"></section>
</main>
```

### 2. Orquestrando via Componente
Recupere a instância e configure o comportamento espacial de forma imperativa e elegante.

```typescript
export class DashboardComponent {
  // O Signal garante que a lógica só dispare quando o DOM estiver pronto
  set layoutMain(layoutSignal: Signal<BlueCrowLayout | null>) {
    const layout = layoutSignal();
    if (layout) {
      // 1. Configuração Base
      layout.setup({
        columns: ['250px', '1fr'],
        boxModel: { spaceBetweenThem: 20 }
      });

      // 2. Responsividade por Container (Engine Interna)
      layout.responsive.set({ maxWidth: 768 }, {
        columns: ['1fr'],
        direction: 'column'
      });

      // 3. Posicionamento Dinâmico de Áreas
      layout.setArea('sidebar', { column: 1, row: '1 / 3' });
    }
  }

  constructor() {
    this.layoutMain = getLayout('main-grid');
  }
}
```

---

## 7. 🧬 Anatomia Técnica

### A Classe `BlueCrowLayout`
É o coração da engine. Ela encapsula:
* **`ResizeObserver`**: Monitora o tamanho do container e aplica breakpoints do `responsiveMap`.
* **`MutationObserver`**: Opcional para monitorar mudanças estruturais de filhos.
* **CSS Variables Bridge**: Traduz configurações JS em variáveis CSS de alta performance (`--cols`, `--area-col`, etc).

### O Registry
Um sistema de `signals` global que mantém o rastro de todas as instâncias ativas, permitindo comunicação *cross-component* sem acoplamento direto.

---

## 8. 🎨 CSS Bridge (O Contrato Visual)

A engine espera um conjunto mínimo de utilitários CSS para processar as variáveis:

```css

.grid {
    display: grid;
}

.grid-template-columns {
    grid-template-columns: var(--cols);
}

.grid-template-rows {
    grid-template-rows: var(--rows);
}

.grid-area {
    grid-column: var(--area-col);
    grid-row: var(--area-row);
}

.grid-auto-flow {
    grid-auto-flow: var(--direction);
}

.box-padding {
    padding: var(--padding);
}

.box-margin {
    margin: var(--margin);
}

.box-gap {
    gap: var(--gap);
}

.box-justify-content {
    justify-content: var(--justify-content);
}

.box-align-content {
    align-content: var(--align-content);
}

.box-justify-items {
    justify-items: var(--justify-items);
}

.box-align-items {
    align-items: var(--align-items);
}
```

---

## 9. 🧹 Garbage Collection
A engine é projetada para aplicações de longa duração (Dashboards/CMS).
* `destroy()`: Desconecta todos os observers e anula referências ao elemento host.
* `unregisterLayout()`: Remove a instância do Signal Registry, liberando a memória imediatamente.

---

> **Nota do Engenheiro:** "Não é sobre fazer o componente caber na tela, é sobre fazer a tela entender o componente." 🐦‍⬛
