/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // O indicador de dev do Next fica sempre em algum canto da tela e acaba
  // sobrepondo algum botao do app (nav embaixo, acoes no topo das telas).
  // Desliga só esse indicador visual — só existe em `next dev`, nunca em
  // producao, e nao desativa o overlay de erro real.
  devIndicators: false,
};

export default nextConfig;
