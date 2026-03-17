'use client';

import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
  block?: boolean; // true → display(block) mode로 강제
}

function renderMath(text: string): string {
  // $$...$$ 블록 수식 먼저 처리
  let result = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return `$$${formula}$$`;
    }
  });

  // $...$ 인라인 수식 처리 ($$는 이미 처리됨)
  result = result.replace(/\$([^$\n]+?)\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return `$${formula}$`;
    }
  });

  // **...** 인라인 볼드 처리 (KaTeX HTML 출력에는 ** 없으므로 안전)
  result = result.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

  return result;
}

export function MathText({ text, className, block = false }: MathTextProps) {
  const html = renderMath(text);
  const Tag = block ? 'div' : 'span';
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
