# Pollar - versão simples

Aplicativo para cadastrar alunos, consultar por nome, série e turma, e atualizar o saldo de Pollars com botões de adicionar e retirar.

## Arquivos principais

- `index.html`: estrutura da página.
- `styles.css`: aparência da página.
- `app.js`: cadastro, filtros, remoção e alteração de saldos.
- `config.js`: URL e chave pública do Supabase.
- `supabase.sql`: criação da tabela online.

## Como funciona

O professor cadastra o aluno com nome, série e turma. Na tabela, cada aluno aparece com saldo, campo de quantidade, botão de adicionar, botão de retirar e um pequeno botão para remover o cadastro.

Os filtros permitem buscar por:

- Nome.
- Série.
- Turma.

## Banco online

O arquivo `config.js` já fica preparado para conectar ao Supabase. Para criar a tabela, abra o Supabase, vá em SQL Editor e execute o conteúdo do arquivo `supabase.sql`.

Depois, publique a pasta no GitHub Pages. Todos os professores que acessarem o link publicado verão os mesmos saldos e poderão atualizar os valores.

## Atenção

Esta versão é simples e usa chave pública do Supabase. Para uma etapa futura mais segura, o ideal é adicionar login dos professores.
