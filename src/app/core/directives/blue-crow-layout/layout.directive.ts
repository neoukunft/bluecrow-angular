import { Directive, ElementRef, inject, input, OnInit, OnDestroy, computed, output, signal } from '@angular/core';

@Directive({
  selector: '[blueCrowLayout]',
  standalone: true
})
export class BlueCrowLayoutDirective implements OnInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef<HTMLElement>);
  private layout = this.el.nativeElement;
  private layoutInstance!: BlueCrowLayout;
  blueCrowLayout = input.required<string | BlueCrowLayoutInterface>();

  ngOnInit(): void {
    this.applyConfig();
  }

  applyConfig() {
    const config = this.blueCrowLayout();

    if (typeof config == 'string') {
      this.layout.id = `layout-${config}`;
      this.layoutInstance = new BlueCrowLayout(this.layout);
      registerLayout(this.layout.id, this.layoutInstance);
    }

    if (typeof config === 'object') {
      if (!config?.name) throw new SyntaxError("Campo name é obrigatório");
      this.layout.id = `layout-${config?.name}`;
      this.layoutInstance = new BlueCrowLayout(this.layout, config);
      registerLayout(this.layout.id, this.layoutInstance);
    }
  }

  ngOnDestroy(): void {
    if (this.layoutInstance) {
      this.layoutInstance.destroy();
      unregisterLayout(this.layout.id);
    }
  }
}

export interface BlueCrowLayoutInterface {
  name?: string;
  type?: 'block' | 'inline';
  direction?: 'row' | 'column' | 'row dense' | 'column dense'
  columns?: (string | number)[];
  rows?: (string | number)[];
  areas?: { [key: string]: BlueCrowLayoutArea };
  boxModel?: BlueCrowBoxModel;
}

interface BlueCrowLayoutArea {
  column: string | number;
  row: string | number;
}

type AxisAlignment = 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around';

interface BlueCrowBoxModel {
  padding?: string | number;
  margin?: string | number;
  spaceBetweenThem?: string | number;
  axisX?: AxisAlignment;
  axisY?: AxisAlignment;
  alignType?: 'items' | 'content' | 'both';
}

export interface ContainerQueryBreakpoints {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  width?: number; // Interpreta como equivalente a maxWidth
  height?: number; // Interpreta como equivalente a maxHeight
}

export class BlueCrowLayout {
  private layout: HTMLElement;
  private defaultLayoutConfig: BlueCrowLayoutInterface = {};
  private responsiveMap = new Map<ContainerQueryBreakpoints, BlueCrowLayoutInterface>();
  private resizeObserver: any;
  private manualObservers: MutationObserver[] = [];
  private cachedAreas: { [key: string]: Partial<BlueCrowLayoutArea> } = {};

  public responsive = {
    set: (breakpoints: ContainerQueryBreakpoints, config: BlueCrowLayoutInterface) => {
      this.responsiveMap.set(breakpoints, config);
      this.initResizeObserver();
    }
  };

  constructor(layout: HTMLElement, config: BlueCrowLayoutInterface = {}) {
    this.layout = layout;
    this.defaultLayoutConfig = config;
    this.display = 'block';

    this.setup(config as BlueCrowLayoutInterface);
  }

  private initResizeObserver() {
    if (!this.resizeObserver && typeof ResizeObserver !== 'undefined') {
      this.layout.style.containerType = 'size';

      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.evaluateBreakpoints(entry.contentRect.width, entry.contentRect.height);
        }
      });
      this.resizeObserver.observe(this.layout);
    }
  }

  private evaluateBreakpoints(currentWidth: number, currentHeight: number) {
    let matchedConfig: BlueCrowLayoutInterface | null = null;

    this.responsiveMap.forEach((config, bp) => {
      let match = true;
      if (bp.minWidth && currentWidth < bp.minWidth) match = false;
      if (bp.minHeight && currentHeight < bp.minHeight) match = false;

      const maxWidth = bp.maxWidth !== undefined ? bp.maxWidth : bp.width;
      const maxHeight = bp.maxHeight !== undefined ? bp.maxHeight : bp.height;

      if (maxWidth !== undefined && currentWidth > maxWidth) match = false;
      if (maxHeight !== undefined && currentHeight > maxHeight) match = false;

      if (match) {
        matchedConfig = config;
      }
    });

    if (matchedConfig) {
      this.setup(Object.assign({}, this.defaultLayoutConfig, matchedConfig));
    } else {
      this.setup(this.defaultLayoutConfig);
    }
  }

  private set display(type: 'block' | 'inline') {
    if (type == 'block') {
      this.layout.classList.add('grid');
    }
    else {
      this.layout.classList.add('inline-grid');
    }
  }

  private set columns(columns: (string | number)[]) {
    if (columns.length > 0) {
      const cols = parseDimension(columns);
      this.layout.classList.add("grid-template-columns");
      this.layout.style.setProperty('--cols', cols);
    }
  }

  private set rows(rows: (string | number)[]) {
    if (rows.length > 0) {
      const lines = parseDimension(rows);
      this.layout.classList.add("grid-template-rows");
      this.layout.style.setProperty('--rows', lines);
    }
  }

  private set areas(areas: { [key: string]: BlueCrowLayoutArea }) {
    if (areas) {
      Object.keys(areas).forEach(nameArea => {
        this.setArea(nameArea, areas[nameArea]);
      });
    }
  }

  setArea(nameArea: string, value: Partial<BlueCrowLayoutArea>) {
    this.cachedAreas[nameArea] = { ...this.cachedAreas[nameArea], ...value };

    const children = this.layout.querySelectorAll(`[data-area="${nameArea}"]`);
    children.forEach(element => {
      const child = element as HTMLElement;
      child.classList.add('grid-area');

      const mergedArea = this.cachedAreas[nameArea];
      if (mergedArea.column !== undefined) child.style.setProperty('--area-col', String(mergedArea.column));
      if (mergedArea.row !== undefined) child.style.setProperty('--area-row', String(mergedArea.row));
    });
  }

  private set direction(dir: 'row' | 'column' | 'row dense' | 'column dense') {
    if (dir) {
      this.layout.classList.add("grid-auto-flow");
      this.layout.style.setProperty("--direction", dir);
    }
  }

  private set boxModel(box: BlueCrowBoxModel) {
    if (box) {
      if (box.padding !== undefined) {
        this.layout.classList.add("box-padding");
        this.layout.style.setProperty("--padding", parseDimension([box.padding]));
      }
      if (box.margin !== undefined) {
        this.layout.classList.add("box-margin");
        this.layout.style.setProperty("--margin", parseDimension([box.margin]));
      }
      if (box.spaceBetweenThem !== undefined) {
        this.layout.classList.add("box-gap");
        this.layout.style.setProperty("--gap", parseDimension([box.spaceBetweenThem]));
      }
      if (box.axisX !== undefined) {
        this.layout.classList.add("box-justify-content");
        this.layout.style.setProperty("--justify-content", box.axisX);
      }
      if (box.axisY !== undefined) {
        this.layout.classList.add("box-align-content");
        this.layout.style.setProperty("--align-content", box.axisY);
      }

      if (box.alignType === 'items' || box.alignType === 'both') {
        if (box.axisX !== undefined) {
          this.layout.classList.add("box-justify-items");
          this.layout.style.setProperty("--justify-items", box.axisX);
        }
        if (box.axisY !== undefined) {
          this.layout.classList.add("box-align-items");
          this.layout.style.setProperty("--align-items", box.axisY);
        }
      }
    }
  }

  setup(config: BlueCrowLayoutInterface) {
    Object.keys(config).forEach(key => {
      const value = (config as any)[key];
      if (value !== undefined && value !== null) {
        (this as any)[key] = value;
      }
    });
  }

  setColumns(columns: (string | number)[]) {
    this.columns = columns;
  }

  setRows(rows: (string | number)[]) {
    this.rows = rows;
  }

  setAreas(areas: { [key: string]: BlueCrowLayoutArea }) {
    this.areas = areas;
  }

  setDirection(dir: 'row' | 'column' | 'row dense' | 'column dense') {
    this.direction = dir;
  }

  setBoxModel(box: BlueCrowBoxModel) {
    this.boxModel = box;
  }

  changeDisplay(type: 'block' | 'inline') {
    this.display = type;
  }

  get boxClientRect() {
    return this.layout.getBoundingClientRect();
  }

  onGridMutation(callback: MutationCallback, config?: MutationObserverInit): MutationObserver {
    const observer = new MutationObserver(callback);

    const observerConfig = config || {
      childList: true,
      attributes: true,
      attributeFilter: ['data-area'],
      subtree: true
    };

    observer.observe(this.layout, observerConfig);
    this.manualObservers.push(observer);
    return observer;
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.manualObservers.forEach(obs => obs.disconnect());
    this.manualObservers = [];

    (this as any).layout = null;
  }
}

export const parseDimension = (value: string | (string | number)[]): string => {
  if (!value) return '';

  if (Array.isArray(value)) {
    return value
      .map(v => typeof v === 'number' ? `${v}px` : v)
      .join(' ');
  }

  return value;
}

const layoutRegistry = signal<Record<string, BlueCrowLayout | null>>({});

const registerLayout = (id: string, el: BlueCrowLayout) => {
  layoutRegistry.update(prev => ({ ...prev, [id]: el }));
};

const unregisterLayout = (id: string) => {
  layoutRegistry.update(prev => {
    const newState = { ...prev };
    delete newState[id];
    return newState;
  });
};

export const getLayout = (id: string) => {
  return computed(() => layoutRegistry()[`layout-${id}`] || null);
};

