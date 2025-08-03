// Cole este código no seu arquivo /functions/index.js

// Importa os módulos necessários do Firebase
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

// Inicializa o Firebase Admin SDK para dar acesso ao backend
admin.initializeApp();

/**
 * Define um Custom Claim 'admin' no Firebase Auth sempre que
 * o campo 'isAdmin' em um documento /users/{uid} no Firestore for alterado.
 */
exports.setAdminClaim = functions
  .region('southamerica-east1') // Manter a região é uma boa prática
  .firestore.document("users/{uid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid;
    const userData = change.after.data();

    if (!userData) {
      logger.info(`Documento do usuário ${uid} foi deletado.`);
      return null;
    }

    // Usamos 'admin' para o claim e 'isAdmin' para o campo no Firestore
    const isUserAdmin = userData.isAdmin === true;

    try {
      const user = await admin.auth().getUser(uid);
      const currentClaims = user.customClaims || {};

      // Verifica se o claim 'admin' já está com o valor correto para evitar escritas desnecessárias
      if (currentClaims.admin === isUserAdmin) {
        logger.info(`Claim 'admin' para ${uid} já está correto. Nenhuma alteração necessária.`);
        return null;
      }

      // Define o custom claim, mantendo os outros que possam existir
      await admin.auth().setCustomUserClaims(uid, { ...currentClaims, admin: isUserAdmin });
      logger.info(`Claim 'admin' definido como ${isUserAdmin} para o usuário ${uid}.`);
      return null;

    } catch (error) {
      logger.error(`Erro ao definir custom claim para o usuário ${uid}:`, error);
      return null;
    }
  });

/**
 * Função HTTPS "onCall" para listar todos os usuários, combinando dados do Auth e Firestore.
 * Apenas usuários com o claim 'admin' podem chamar esta função.
 */
exports.listUsers = functions
  .region('southamerica-east1') // É importante que a região seja a mesma da outra função
  .https.onCall(async (data, context) => {
    // 1. Verifica se o usuário está autenticado e se é um admin
    if (!context.auth || context.auth.token.admin !== true) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Você não tem permissão para executar esta ação.'
      );
    }

    try {
      // 2. Busca todos os usuários do Firebase Authentication
      const listUsersResult = await admin.auth().listUsers(1000);

      // 3. Busca os dados complementares de todos os usuários no Firestore
      const firestoreSnap = await admin.firestore().collection('users').get();
      const firestoreDataMap = {};
      firestoreSnap.forEach(doc => {
        firestoreDataMap[doc.id] = doc.data();
      });

      // 4. Combina os dados do Auth e do Firestore
      const combinedUsers = listUsersResult.users.map(user => {
        const firestoreInfo = firestoreDataMap[user.uid] || {};
        return {
          uid: user.uid,
          email: user.email,
          nome: firestoreInfo.nome || user.displayName || 'Nome não informado',
          isAdmin: firestoreInfo.isAdmin === true,
          permissoes: firestoreInfo.permissoes || {},
        };
      });

      logger.info(`Admin ${context.auth.token.email} listou ${combinedUsers.length} usuários.`);
      return { users: combinedUsers };

    } catch (error) {
      logger.error("Erro fatal ao listar usuários:", error);
      throw new functions.https.HttpsError('internal', 'Ocorreu um erro interno ao buscar a lista de usuários.');
    }
  });
