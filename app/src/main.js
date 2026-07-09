import { createStore } from './state.js';
import { renderApp } from './render.js';

const root = document.getElementById('app');

createStore((vals) => renderApp(root, vals));
