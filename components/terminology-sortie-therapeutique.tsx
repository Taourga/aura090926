"use client";

import { useEffect } from "react";

const replacements: Array<[RegExp, string]> = [
  [/\bPermissions\b/g, "Sorties thérapeutiques"],
  [/\bPermission\b/g, "Sortie thérapeutique"],
  [/\bpermissions\b/g, "sorties thérapeutiques"],
  [/\bpermission\b/g, "sortie thérapeutique"],
];

function replaceTerminology(value: string) {
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function patchTextNode(node: Text) {
  const current = node.nodeValue;
  if (!current || !/permission/i.test(current)) return;
  const next = replaceTerminology(current);
  if (next !== current) node.nodeValue = next;
}

function patchElement(element: Element) {
  for (const attribute of ["aria-label", "title", "placeholder"]) {
    const current = element.getAttribute(attribute);
    if (!current || !/permission/i.test(current)) continue;
    const next = replaceTerminology(current);
    if (next !== current) element.setAttribute(attribute, next);
  }
}

function patchTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    patchTextNode(root as Text);
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) patchElement(root as Element);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) patchTextNode(node as Text);
    else patchElement(node as Element);
    node = walker.nextNode();
  }
}

export function TerminologySortieTherapeutique() {
  useEffect(() => {
    patchTree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          patchTextNode(mutation.target as Text);
          continue;
        }
        mutation.addedNodes.forEach(patchTree);
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
