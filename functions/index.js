/**
 * Importação dos módulos necessários do Firebase.
 * functions: Módulo principal para criar Cloud Functions.
 * logger: Para registrar informações e erros, muito útil para depuração.
 * https: Para criar funções que podem ser chamadas através de uma URL (API).
 * admin: Para dar às nossas funções acesso de administrador ao projeto Firebase.
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

// Inicializa o SDK de Admin do Firebase, permitindo que as funções ajam em nome do serviço.
admin.initializeApp();

/**
 * ======================================================================================
 * FUNÇÕES DE GERENCIAMENTO DE USUÁRIOS
 * ======================================================================================
 * Esta seção conterá todas as funções relacionadas a usuários:
 * - Listar todos os usuários para o painel de admin.
 * - Criar um novo usuário (no Authentication e no Firestore).
 * - Atualizar as permissões de um usuário.
 * - Deletar um usuário.
 * - Disparar o e-mail de boas-vindas.
 * ======================================================================================
 */

// Exemplo de uma função "helloWorld" para testar a implantação.
// Podemos remover isso mais tarde.
exports.helloWorld = functions.https.onRequest((request, response) => {
  logger.info("Função helloWorld foi chamada!", { structuredData: true });
  response.send("Olá do Firebase, Mercocamp! Suas Cloud Functions estão funcionando.");
});

// TODO: Implementar a função para listar usuários (listUsers)
// TODO: Implementar a função para criar um novo usuário (createUser)
// TODO: Implementar a função para atualizar um usuário (updateUser)
// TODO: Implementar a função para deletar um usuário (deleteUser)
