# Sistema MeatPack - Gestão de estoque e logística para açougue

![React Native](https://img.shields.io/badge/React_Native-0.74.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)
![Expo](https://img.shields.io/badge/Expo-54.0-000020.svg)


Sistema de gestão e controle de estoque para o controle preciso de produtos, pedidos e movimentação de estoque. Desenvolvido para atender às demandas de conferência de cargas, auditoria e gerenciamento de inventário físico de produtos cárneos.

---

## 📝 Descrição Resumida do Sistema

 Aplicação comercial híbrida (focada em dispositivos móveis através do Expo, mas com suporte a simulações completas em ambiente Web). O sistema resolve problemas comuns de consistência de inventário em frigoríficos e açougues, permitindo a separação de permissões entre Administradores e Operadores comerciais. O aplicativo adota uma arquitetura isolada de persistência, utilizando banco de dados relacional local para o aplicativo móvel e emulando o mesmo comportamento via armazenamento local nos navegadores.

---

## ✨ Principais Funcionalidades

* 👥 **Gestão hierárquica de acesso:** Fluxo de autenticação blindado para Operadores e uma Conta Master de Administrador, permitindo o gerenciamento completo de credenciais e auditoria de usuários.
* 📦 **Controle de estoque inteligente:** Consulta, filtragem por categoria, busca textual por descrição e ordenação avançada de insumos por peso ou valor monetário.
* 🏬 **Edição inline de lotes:** Janela modal integrada diretamente à consulta de inventário, facilitando a alteração imediata de códigos, descrições e fornecedores sem quebras de navegação.
* 📋 **Gestão dinâmica de pedidos:** Agendamento em lote de ordens de compra vinculadas a fornecedores homologados, com seletores visuais customizados de data e hora.
* 🚚 **Auditoria temporal (Kardex):** Registro automático e imutável de fluxos de entrada (recebimento de pedidos com carimbo de validação de Nota Fiscal) e saídas imediatas (área de vendas, descartes ou avarias) com atualização em tempo real do saldo em quilogramas (kg).

---

## 🛠️ Tecnologias Uuilizadas

O sistema foi construído sob uma arquitetura moderna e de alta performance, exigindo conformidade mínima com os ecossistemas abaixo:

* **Expo SDK 51:** Utilizado como base do ecossistema, aproveitando as novas diretrizes assíncronas do framework.
* **React Native 0.74:** Framework principal para renderização de componentes visuais fluidos a 60 FPS utilizando a UI Thread nativa.
* **TypeScript 5.0+:** Injeção de tipagem estrita (`Type Safety`) em parâmetros de rotas e mapeamento de payloads de dados.
* **SQLite (`expo-sqlite`):** Mecanismo de persistência relacional local utilizado no ambiente nativo/mobile, utilizando a API moderna `openDatabaseSync` e transações atômicas com `withTransactionAsync`.
* **AsyncStorage:** Utilizado para a persistência de sessões de login no mobile e para a emulação completa de tabelas e histórico (Kardex) no ambiente Web.
* **Expo Vector Icons (MaterialIcons):** Identidade visual baseada em padrões universais de iconografia logística.

---

## 🚀 Como executar o projeto?

Siga os passos abaixo para configurar e rodar o projeto localmente em sua máquina de desenvolvimento:

### 1. Clone o repositório
    git clone [https://github.com/seu-usuario/sistema-meatpack.git](https://github.com/seu-usuario/sistema-meatpack.git)
    cd sistema-meatpack

### 2. Instale as dependências
    npm install
    # ou se preferir utilizar o yarn:
    # yarn install

### 3. Execute o projeto
    npx expo start

### 4. Escaneie o QR Code
* Abra o aplicativo **Expo Go** no seu dispositivo móvel (disponível para Android e iOS).
* Certifique-se de que o computador e o celular estão conectados à mesma rede Wi-Fi.
* Escaneie o QR code exibido no terminal ou na página web aberta pelo bundler do Expo para testar o aplicativo nativamente.