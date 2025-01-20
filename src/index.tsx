/* @refresh reload */
import { render } from 'solid-js/web';
import type { Component } from 'solid-js';
import { FocusManager } from './focus';
import './main.css';

const App: Component = () => {
  return (
    <FocusManager>
      <div class="gap-8 p-8 grid">
        <div class="gap-4 grid grid-cols-3">
          <button>1</button>
          <button>2</button>
          <button>3</button>
        </div>
        <div class="gap-4 grid grid-cols-2">
          <input type="text" />
          <input type="text" />
        </div>
        <div class="gap-4 grid grid-cols-2">
          <section tabIndex={0} class="border">
            <h2>a focusable section</h2>
            <button>1</button>
            <button>2</button>
            <p>hi</p>
            <input type="text" />
          </section>
          <section tabIndex={0} class="border">
            <h2>a focusable section</h2>
            <button>1</button>
            <button>2</button>
            <p>hi</p>
            <input type="text" />
            <section tabIndex={0} class="border">
              <h2>a focusable section</h2>
              <button>1</button>
              <button>2</button>
              <p>hi</p>
              <input type="text" />
            </section>
          </section>
        </div>
        <section tabIndex={0} class="border">
          <h2>a focusable section</h2>
          <button>1</button>
          <button>2</button>
          <p>hi</p>
          <input type="text" />
        </section>
        <div>
          <button>1</button>
        </div>
      </div>
    </FocusManager>
  );
};

render(() => <App />, document.getElementById('app')!);
