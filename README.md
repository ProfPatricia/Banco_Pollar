# Pollar - versão simplificada

Aplicativo para cadastrar alunos, filtrar por série/turma/nome e atualizar o saldo de Pollars.

## Arquivos

- `index.html`: tela do aplicativo.
- `styles.css`: visual.
- `app.js`: funcionamento.
- `config.js`: configuração do banco online.
- `supabase.sql`: comando para criar a tabela no Supabase.

## Como usar sem banco online

Abra o `index.html` no navegador. Os dados ficam salvos apenas no navegador usado.

## Como ativar o banco online gratuito

1. Crie uma conta gratuita em https://supabase.com.
2. Crie um novo projeto.
3. No Supabase, abra o editor SQL e execute o conteúdo do arquivo `supabase.sql`.
4. No Supabase, vá em Project Settings > API.
5. Copie a URL do projeto e a chave `anon public`.
6. Cole esses dados no arquivo `config.js`.
7. Publique a pasta em um serviço gratuito, como Netlify, Vercel ou GitHub Pages.

Depois disso, os professores que abrirem o mesmo aplicativo verão os mesmos alunos e poderão atualizar os saldos.

## Atenção

Esta configuração é simples e fácil para uso pedagógico inicial. Para uso com dados reais de muitos alunos, o ideal é uma segunda etapa com login de professores.
