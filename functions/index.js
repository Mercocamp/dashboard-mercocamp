/**
 * Importação dos módulos necessários do Firebase.
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

// --- NOVA IMPORTAÇÃO: CORS ---
// Pacote para lidar com as permissões de acesso de diferentes origens (domínios)
const cors = require("cors")({ origin: true });

admin.initializeApp();

/**
 * ======================================================================================
 * FUNÇÕES DE GERENCIAMENTO DE USUÁRIOS
 * ======================================================================================
 */

/**
 * Lista todos os usuários do Firebase Authentication e combina com seus dados do Firestore.
 * Apenas administradores podem chamar esta função.
 * --- ATUALIZADO com CORS ---
 */
exports.listUsers = functions.https.onCall(async (data, context) => {
  // Verificação de Autenticação e Permissão
  // O token 'isAdmin' será adicionado ao seu usuário na próxima etapa.
  if (!context.auth || !context.auth.token.isAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas administradores podem listar usuários.'
    );
  }

  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const authUsers = listUsersResult.users;

    const usersCollection = await admin.firestore().collection('users').get();
    const firestoreUsers = {};
    usersCollection.forEach(doc => {
      firestoreUsers[doc.id] = doc.data();
    });

    const combinedUsers = authUsers.map(authUser => {
      const firestoreData = firestoreUsers[authUser.uid] || {};
      return {
        uid: authUser.uid,
        email: authUser.email,
        nome: firestoreData.nome || authUser.displayName || 'Nome não definido',
        isAdmin: firestoreData.isAdmin || false,
        permissoes: firestoreData.permissoes || {},
      };
    });

    logger.info(`Admin ${context.auth.token.email} listou ${combinedUsers.length} usuários.`);
    return combinedUsers;

  } catch (error) {
    logger.error("Erro ao listar usuários:", error);
    throw new functions.https.HttpsError(
      'internal',
      'Ocorreu um erro inesperado ao buscar a lista de usuários.'
    );
  }
});

// Exemplo de uma função "helloWorld" para testar a implantação.
exports.helloWorld = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        logger.info("Função helloWorld foi chamada!", { structuredData: true });
        response.send("Olá do Firebase, Mercocamp! Suas Cloud Functions estão funcionando.");
    });
});

// TODO: Implementar a função para criar um novo usuário (createUser)
// TODO: Implementar a função para atualizar um usuário (updateUser)
// TODO: Implementar a função para deletar um usuário (deleteUser)
