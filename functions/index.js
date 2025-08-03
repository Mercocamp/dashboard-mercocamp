const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Cria um novo usuário no Firebase Auth e salva seus detalhes no Firestore.
 * Apenas administradores podem chamar esta função.
 */
exports.createUser = functions.https.onCall(async (data, context) => {
  // Verifica se o usuário que está fazendo a chamada é um administrador.
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Apenas administradores podem criar novos usuários."
    );
  }

  const { email, password, nome, isAdmin, permissoes } = data;

  try {
    // Cria o usuário no Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nome,
    });

    // Define o custom claim de admin no Auth
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: isAdmin });

    // Salva os dados do usuário (incluindo permissões) no Firestore
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      nome: nome,
      email: email,
      isAdmin: isAdmin,
      permissoes: permissoes || {},
    });

    return { result: `Usuário ${email} criado com sucesso.` };
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Atualiza os dados de um usuário existente no Firestore e seus claims no Auth.
 * Apenas administradores podem chamar esta função.
 */
exports.updateUser = functions.https.onCall(async (data, context) => {
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Apenas administradores podem atualizar usuários."
    );
  }

  const { uid, nome, isAdmin, permissoes } = data;

  try {
    // Atualiza o custom claim de admin
    await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });

    // Atualiza os dados no Firestore
    await admin.firestore().collection("users").doc(uid).update({
      nome: nome,
      isAdmin: isAdmin,
      permissoes: permissoes || {},
    });

    return { result: `Usuário ${uid} atualizado com sucesso.` };
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Deleta um usuário do Firebase Auth e do Firestore.
 * Apenas administradores podem chamar esta função.
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Apenas administradores podem deletar usuários."
    );
  }

  const { uid } = data;

  try {
    // Deleta do Authentication
    await admin.auth().deleteUser(uid);
    // Deleta do Firestore
    await admin.firestore().collection("users").doc(uid).delete();

    return { result: `Usuário ${uid} deletado com sucesso.` };
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
