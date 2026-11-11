'use client';

import * as React from 'react';

/**
 * LiveKit's prefab components (ControlBar, Chat, PreJoin...) have hardcoded English
 * labels. This rewrites those exact texts/attributes to Brazilian Portuguese.
 */
const PT_BR: Record<string, string> = {
  Microphone: 'Microfone',
  Camera: 'Câmera',
  'Share screen': 'Compartilhar tela',
  'Stop screen share': 'Parar compartilhamento',
  Chat: 'Chat',
  Leave: 'Sair',
  Disconnect: 'Sair',
  Disconnected: 'Desconectado',
  'Join Room': 'Entrar na sala',
  Username: 'Seu nome',
  Send: 'Enviar',
  'Enter a message...': 'Digite uma mensagem...',
  Messages: 'Mensagens',
  Settings: 'Configurações',
  'Allow Audio': 'Permitir áudio',
  'Start Audio': 'Ativar áudio',
  'Start Video': 'Ativar vídeo',
  'Audio inputs': 'Entradas de áudio',
  'Video inputs': 'Entradas de vídeo',
  Default: 'Padrão',
  Audio: 'Áudio',
  Video: 'Vídeo',
};

const ATTRS = ['placeholder', 'title', 'aria-label'];

function translate(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node: Node | null = root;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue?.trim();
      if (text && PT_BR[text] && PT_BR[text] !== text) {
        node.nodeValue = node.nodeValue!.replace(text, PT_BR[text]);
      }
    } else if (node instanceof Element) {
      for (const attr of ATTRS) {
        const v = node.getAttribute(attr);
        // Only write when it changes: writing the same value would re-trigger the observer forever.
        if (v && PT_BR[v] && PT_BR[v] !== v) node.setAttribute(attr, PT_BR[v]);
      }
    }
    node = walker.nextNode();
  }
}

export function TranslateLiveKit() {
  React.useEffect(() => {
    translate(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'characterData' || m.type === 'attributes') translate(m.target);
        m.addedNodes.forEach(translate);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
