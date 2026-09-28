/** <details>/<summary> nativos — acordeão sem JS, com foco de teclado e
 *  leitor de tela de graça. group-open: espelha o "+" pra "-" no estado aberto. */
export function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-edge py-4 first:pt-0 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink_text marker:content-none [&::-webkit-details-marker]:hidden">
        {question}
        <span className="shrink-0 text-lg text-muted transition-transform group-open:rotate-45">+</span>
      </summary>
      <p className="mt-2 max-w-2xl text-sm text-muted">{answer}</p>
    </details>
  );
}
