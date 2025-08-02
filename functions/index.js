/**
 * Importação dos módulos necessários do Firebase.
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

admin.initializeApp();

/**
 * ======================================================================================
 * FUNÇÕES DE GERENCIAMENTO DE USUÁRIOS
 * ======================================================================================
 */

/**
 * Define a custom claim 'isAdmin' no token de um usuário.
 * Esta função é acionada sempre que um documento na coleção 'users' é criado ou atualizado.
 */
exports.setAdminClaim = functions.firestore
  .document("users/{uid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid;
    const userData = change.after.data();

    // Se o documento foi deletado, não faz nada.
    if (!userData) {
      logger.info(`Documento do usuário ${uid} deletado.`);
      return null;
    }

    const isAdmin = userData.isAdmin === true;

    try {
      // Pega o usuário atual para verificar suas claims existentes.
      const user = await admin.auth().getUser(uid);
      const currentClaims = user.customClaims || {};

      // Se a claim 'isAdmin' já estiver correta, não faz nada para evitar loops.
      if (currentClaims.isAdmin === isAdmin) {
        logger.info(`Claim 'isAdmin' para o usuário ${uid} já está atualizada.`);
        return null;
      }

      // Define a custom claim no token do usuário.
      await admin.auth().setCustomUserClaims(uid, { ...currentClaims, isAdmin: isAdmin });
      logger.info(`Claim 'isAdmin' definida como ${isAdmin} para o usuário ${uid}.`);
      return null;

    } catch (error) {
      logger.error(`Erro ao definir custom claim para o usuário ${uid}:`, error);
      return null;
    }
  });


/**
 * Lista todos os usuários do Firebase Authentication e combina com seus dados do Firestore.
 * Apenas administradores podem chamar esta função.
 */
exports.listUsers = functions.https.onCall(async (data, context) => {
  // Verificação de Autenticação e Permissão
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
    logger.info("Função helloWorld foi chamada!", { structuredData: true });
    response.send("Olá do Firebase, Mercocamp! Suas Cloud Functions estão funcionando.");
});

// TODO: Implementar a função para criar um novo usuário (createUser)
// TODO: Implementar a função para atualizar um usuário (updateUser)
// TODO: Implementar a função para deletar um usuário (deleteUser)
