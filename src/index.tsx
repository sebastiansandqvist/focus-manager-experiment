/* @refresh reload */
import { render } from 'solid-js/web';
import type { Component } from 'solid-js';
import { FocusManager } from './focus';
import { Coverflow } from './coverflow';
import './main.css';

const App: Component = () => {
  return (
    <FocusManager>
      <Coverflow />
      <div class="flex gap-2 overflow-x-scroll">
        <div tabIndex={0} class="aspect-video h-36 bg-red-500" />
        <div tabIndex={0} class="aspect-video h-36 bg-blue-500" />
        <div tabIndex={0} class="aspect-video h-36 bg-green-500" />
        <div tabIndex={0} class="aspect-video h-36 bg-yellow-500" />
        <div tabIndex={0} class="aspect-video h-36 bg-purple-500" />
        <div tabIndex={0} class="aspect-video h-36 bg-pink-500" />
        <div tabIndex={0} class="aspect-video h-36 bg-indigo-500" />
        <div tabIndex={0} class="aspect-video h-36 bg-orange-500" />
        <div tabIndex={0} class="aspect-video h-36 bg-teal-500" />
        <div tabIndex={0} class="aspect-video h-36 bg-cyan-500" />
        <div tabIndex={0} class="aspect-video h-36 bg-lime-500" />
      </div>
      <div class="grid gap-8 p-8">
        <div class="grid grid-cols-4 gap-4">
          <button>1</button>
          <button>2</button>
          <button>3</button>
          <button>4</button>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <button>1</button>
          <button>2</button>
          <button>3</button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <input type="text" />
          <input type="text" />
        </div>
        <div class="grid grid-cols-2 gap-4">
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
