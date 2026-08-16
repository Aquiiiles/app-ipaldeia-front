// Credos usados na liturgia da igreja. O texto abaixo é a versão que a IP Aldeia
// recita nos cultos — não substitua por outra tradução sem confirmar com a
// liderança, porque a redação varia bastante entre as traduções em português.

export type Creed = {
  title: string;
  subtitle: string;
  /** Cada item é uma estrofe, na mesma divisão usada na liturgia. */
  paragraphs: string[];
};

export const CREDO_NICENO: Creed = {
  title: 'Credo Niceno',
  subtitle: 'Concílio de Niceia (325) e de Constantinopla (381)',
  paragraphs: [
    'Creio em um Deus, Pai Todo-Poderoso, Criador do céu e da terra, e de todas as '
      + 'coisas visíveis e invisíveis; e em um Senhor Jesus Cristo, o unigênito Filho '
      + 'de Deus, gerado pelo Pai antes de todos os séculos, Deus de Deus, Luz da Luz, '
      + 'verdadeiro Deus de verdadeiro Deus, gerado não feito, de uma só substância '
      + 'com o Pai;',

    'pelo qual todas as coisas foram feitas; o qual por nós homens e por nossa '
      + 'salvação, desceu dos céus, foi feito carne pelo Espírito Santo da Virgem '
      + 'Maria, e foi feito homem; e foi crucificado por nós sob o poder de Pôncio '
      + 'Pilatos.',

    'Ele padeceu e foi sepultado; e no terceiro dia ressuscitou conforme as '
      + 'Escrituras; e subiu ao céu e assentou-se à direita do Pai, e de novo há de '
      + 'vir com glória para julgar os vivos e os mortos, e seu reino não terá fim.',

    'E no Espírito Santo, Senhor e Vivificador, que procede do Pai e do Filho, que '
      + 'com o Pai e o Filho conjuntamente é adorado e glorificado, que falou através '
      + 'dos profetas. Creio na Igreja una, universal e apostólica, reconheço um só '
      + 'batismo para remissão dos pecados; e aguardo a ressurreição dos mortos e da '
      + 'vida do mundo vindouro.',
  ],
};
