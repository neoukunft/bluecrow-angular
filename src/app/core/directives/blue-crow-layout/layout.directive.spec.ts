import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { BlueCrowLayoutDirective, BlueCrowLayout, getLayout } from './layout.directive';

@Component({
  template: `
    <div [blueCrowLayout]="config">
      <div data-area="sidebar"></div>
      <div data-area="content"></div>
    </div>
  `,
  standalone: true,
  imports: [BlueCrowLayoutDirective]
})
class TestHostComponent {
  config: any = {
    name: 'test-layout',
    columns: ['200px', '1fr'],
    boxModel: {
      padding: 20
    }
  };
}

describe('Engine Documentação: BlueCrowLayout', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let layoutEl: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent, BlueCrowLayoutDirective]
    });
    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    layoutEl = fixture.nativeElement.querySelector('div');
    fixture.detectChanges();
  });

  describe('1. Inicialização e Registro (Signal Registry)', () => {
    it('deve registrar o layout no Signal global com o ID correto e instanciar a classe', () => {
      const signalLayout = getLayout('test-layout');
      expect(signalLayout()).toBeTruthy();
      expect(signalLayout() instanceof BlueCrowLayout).toBe(true);
    });

    it('deve adicionar as classes base da Grid e injetar as variáveis CSS no elemento nativo', () => {
      expect(layoutEl.classList.contains('grid')).toBe(true);
      expect(layoutEl.classList.contains('grid-template-columns')).toBe(true);
      expect(layoutEl.classList.contains('box-padding')).toBe(true);

      expect(layoutEl.style.getPropertyValue('--cols')).toBe('200px 1fr');
      expect(layoutEl.style.getPropertyValue('--padding')).toBe('20px');
    });
  });

  describe('2. Definição Dinâmica de Áreas (Grid Areas)', () => {
    it('deve injetar propriedades de área nas marcações filhas detectadas via [data-name]', () => {
      const layoutInstance = getLayout('test-layout')() as BlueCrowLayout;
      layoutInstance.setArea('sidebar', { column: '1 / 2', row: 1 });

      const sidebar = layoutEl.querySelector('[data-name="sidebar"]') as HTMLElement;
      expect(sidebar.classList.contains('grid-area')).toBe(true);
      // Validando o CSS Bridge Injetado Imperativamente
      expect(sidebar.style.getPropertyValue('--area-col')).toBe('1 / 2');
      expect(sidebar.style.getPropertyValue('--area-row')).toBe('1');
    });
  });

  describe('3. Responsividade por Container (ResizeObserver Bridge)', () => {
    it('deve inicializar o ResizeObserver e declarar a tag para CSS Container Queries', () => {
      const layoutInstance = getLayout('test-layout')() as BlueCrowLayout;

      // Passando as quebras declarativas programáveis
      layoutInstance.responsive.set({ maxWidth: 400 }, { columns: ['1fr'] });

      // Valida se preparou o terreno no DOM pra que stylesheets reajam se precisarem isoladamente
      expect(layoutEl.style.containerType).toBe('size');
    });
  });

  describe('4. Gestão de Memória (Garbage Collection)', () => {
    it('deve remover a instância do array de signals e limpar referências pesadas de DOM Destroy', () => {
      // Simula o componente da rota sendo destruído
      fixture.destroy();

      const signalLayout = getLayout('test-layout');
      // O identificador string é instantaneamente anulado do signal desesgastando a UI!
      expect(signalLayout()).toBeNull();
    });
  });
});
