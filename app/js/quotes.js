/*
 * Câu nói hay: tục ngữ, ca dao và danh ngôn, mỗi lần hiện một câu khác.
 *
 * Có sẵn ~130 câu chọn lọc (chạy cả khi mất mạng). Mỗi ngày tải thêm:
 *   - 50 danh ngôn mới của ZenQuotes (zenquotes.io, miễn phí, ghi nguồn), dịch sang tiếng Việt, cộng dồn vào kho
 *     trên TV (tối đa ZEN_MAX câu, câu cũ nhất rơi ra), nên càng dùng càng nhiều câu;
 *   - ~130 câu tục ngữ của trang "Tục ngữ Việt Nam" trên Wikiquote tiếng Việt, làm mới mỗi tuần.
 * Giao diện tiếng Anh: danh ngôn ZenQuotes nguyên bản tiếng Anh, và các câu chọn lọc có bản tiếng Anh (phần tử thứ ba:
 * câu gốc của danh ngôn, hoặc bản dịch của tục ngữ, ca dao); tục ngữ trên Wikiquote chỉ có tiếng Việt nên không hiện.
 *
 *   Quotes.load(cb)        tải nguồn trực tuyến (cache theo ngày), cb() khi xong
 *   Quotes.next()          câu kế tiếp: xen kẽ danh ngôn mới, câu chọn lọc và tục ngữ -> {text, by}
 *   Quotes.today(date)     một câu cố định cho cả ngày      Quotes.at(i) -> {text, by}
 */
(function (root) {
  'use strict';

  var Q = [
    ['Công cha như núi Thái Sơn, nghĩa mẹ như nước trong nguồn chảy ra.', 'Ca dao', 'A father\'s love is like Mount Thái Sơn; a mother\'s devotion is like water flowing from the spring.'],
    ['Anh em như thể tay chân, rách lành đùm bọc, dở hay đỡ đần.', 'Ca dao', 'Brothers and sisters are like hands and feet: they look after each other in good times and bad.'],
    ['Gia đình là nơi cuộc sống bắt đầu và tình yêu không bao giờ kết thúc.', 'Khuyết danh', 'Family is where life begins and love never ends.'],
    ['Thuận vợ thuận chồng, tát biển Đông cũng cạn.', 'Tục ngữ', 'When husband and wife agree, they can empty the East Sea.'],
    ['Ăn quả nhớ kẻ trồng cây.', 'Tục ngữ', 'When you eat the fruit, remember who planted the tree.'],
    ['Uống nước nhớ nguồn.', 'Tục ngữ', 'When you drink water, remember its source.'],
    ['Đi một ngày đàng, học một sàng khôn.', 'Tục ngữ', 'Travel for a day and you come back with a basketful of wisdom.'],
    ['Có công mài sắt, có ngày nên kim.', 'Tục ngữ', 'Keep grinding an iron bar and one day it becomes a needle.'],
    ['Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao.', 'Ca dao', 'One tree cannot make a hill; three trees together make a high mountain.'],
    ['Lá lành đùm lá rách.', 'Tục ngữ', 'The whole leaf wraps the torn one.'],
    ['Tốt gỗ hơn tốt nước sơn.', 'Tục ngữ', 'Good wood matters more than good paint.'],
    ['Học ăn, học nói, học gói, học mở.', 'Tục ngữ'],
    ['Không thầy đố mày làm nên.', 'Tục ngữ', 'Without a teacher, no one gets far.'],
    ['Muốn sang thì bắc cầu kiều, muốn con hay chữ thì yêu lấy thầy.', 'Ca dao', 'To cross the river, build a bridge; for your child to learn, cherish the teacher.'],
    ['Người ta là hoa đất.', 'Tục ngữ', 'People are the flowers of the earth.'],
    ['Một nụ cười bằng mười thang thuốc bổ.', 'Tục ngữ', 'A smile is worth ten doses of medicine.'],
    ['Lời nói chẳng mất tiền mua, lựa lời mà nói cho vừa lòng nhau.', 'Ca dao', 'Words cost nothing, so choose them to please each other.'],
    ['Thương người như thể thương thân.', 'Tục ngữ', 'Love others as you love yourself.'],
    ['Có chí thì nên.', 'Tục ngữ', 'Where there\'s a will, there\'s a way.'],
    ['Thất bại là mẹ thành công.', 'Tục ngữ', 'Failure is the mother of success.'],
    ['Nước chảy đá mòn.', 'Tục ngữ', 'Running water wears away the stone.'],
    ['Ăn có nhai, nói có nghĩ.', 'Tục ngữ', 'Chew before you swallow; think before you speak.'],
    ['Đói cho sạch, rách cho thơm.', 'Tục ngữ', 'Stay clean even when hungry, and fragrant even in rags.'],
    ['Con hơn cha là nhà có phúc.', 'Tục ngữ', 'A child who does better than the parents is a blessing to the family.'],
    ['Dù ai đi ngược về xuôi, nhớ ngày Giỗ Tổ mùng mười tháng ba.', 'Ca dao'],
    ['Không có việc gì khó, chỉ sợ lòng không bền. Đào núi và lấp biển, quyết chí ắt làm nên.', 'Hồ Chí Minh', 'Nothing is too hard; only fear a heart that gives up. Dig through mountains, fill in seas: with resolve, it can be done.'],
    ['Vì lợi ích mười năm thì phải trồng cây, vì lợi ích trăm năm thì phải trồng người.', 'Hồ Chí Minh', 'For ten years\' benefit, plant trees; for a hundred years\' benefit, raise people.'],
    ['Đoàn kết, đoàn kết, đại đoàn kết. Thành công, thành công, đại thành công.', 'Hồ Chí Minh', 'Unity, unity, great unity. Success, success, great success.'],
    ['Lấy đại nghĩa để thắng hung tàn, lấy chí nhân để thay cường bạo.', 'Nguyễn Trãi', 'Use great righteousness to defeat cruelty, and kindness to replace tyranny.'],
    ['Hiền tài là nguyên khí của quốc gia.', 'Thân Nhân Trung', 'Talented and virtuous people are the life force of a nation.'],
    ['Sống là cho đâu chỉ nhận riêng mình.', 'Tố Hữu', 'To live is to give, not only to receive.'],
    ['Hành trình vạn dặm bắt đầu từ một bước chân.', 'Lão Tử', 'A journey of a thousand miles begins with a single step.'],
    ['Biết người là khôn, biết mình là sáng suốt.', 'Lão Tử', 'Knowing others is wisdom; knowing yourself is enlightenment.'],
    ['Học mà không nghĩ thì uổng công, nghĩ mà không học thì nguy.', 'Khổng Tử', 'Learning without thought is labour lost; thought without learning is perilous.'],
    ['Điều mình không muốn, chớ làm cho người.', 'Khổng Tử', 'Do not do to others what you would not want done to yourself.'],
    ['Hãy là sự thay đổi mà bạn muốn thấy trên thế giới.', 'Mahatma Gandhi', 'Be the change that you wish to see in the world.'],
    ['Trí tưởng tượng quan trọng hơn kiến thức.', 'Albert Einstein', 'Imagination is more important than knowledge.'],
    ['Cuộc sống giống như đi xe đạp. Muốn giữ thăng bằng, bạn phải tiếp tục di chuyển.', 'Albert Einstein', 'Life is like riding a bicycle. To keep your balance, you must keep moving.'],
    ['Hãy cứ khát khao, hãy cứ dại khờ.', 'Steve Jobs', 'Stay hungry, stay foolish.'],
    ['Cách duy nhất để làm việc lớn là yêu việc mình làm.', 'Steve Jobs', 'The only way to do great work is to love what you do.'],
    ['Thành công không phải là đích đến, mà là một hành trình.', 'Arthur Ashe', 'Success is a journey, not a destination.'],
    ['Điều quan trọng không phải là ta sống bao lâu, mà là ta sống thế nào.', 'Seneca', 'What matters is not how long we live, but how well.'],
    ['Hạnh phúc không phải là thứ có sẵn. Nó đến từ chính hành động của bạn.', 'Đạt Lai Lạt Ma', 'Happiness is not something ready made. It comes from your own actions.'],
    ['Đừng đếm những ngày trôi qua, hãy làm cho mỗi ngày đều đáng giá.', 'Muhammad Ali', 'Don\'t count the days; make the days count.'],
    ['Người bi quan nhìn thấy khó khăn trong mỗi cơ hội; người lạc quan nhìn thấy cơ hội trong mỗi khó khăn.', 'Winston Churchill', 'A pessimist sees the difficulty in every opportunity; an optimist sees the opportunity in every difficulty.'],
    ['Giáo dục là vũ khí mạnh nhất mà bạn có thể dùng để thay đổi thế giới.', 'Nelson Mandela', 'Education is the most powerful weapon which you can use to change the world.'],
    ['Mọi việc luôn có vẻ bất khả thi cho đến khi nó được hoàn thành.', 'Nelson Mandela', 'It always seems impossible until it\'s done.'],
    ['Thời gian là thứ quý giá nhất mà ta có thể cho đi.', 'Khuyết danh', 'Time is the most precious thing we can give.'],
    ['Đọc sách là cách ngồi một chỗ mà đi khắp thế gian.', 'Khuyết danh', 'Reading lets you travel the world without leaving your seat.'],
    ['Nhà là nơi có người chờ mình trở về.', 'Khuyết danh', 'Home is where someone is waiting for you to come back.'],
    ['Ngày hôm nay là món quà, vì thế người ta gọi nó là hiện tại.', 'Khuyết danh', 'Today is a gift; that\'s why it\'s called the present.'],
    ['Hãy yêu thương nhau khi còn có thể.', 'Trịnh Công Sơn', 'Love one another while you still can.'],
    ['Sống trong đời sống cần có một tấm lòng, để làm gì em biết không? Để gió cuốn đi.', 'Trịnh Công Sơn'],
    ['Ơn cha nặng lắm ai ơi, nghĩa mẹ bằng trời chín tháng cưu mang.', 'Ca dao', 'A father\'s kindness weighs so much; a mother\'s love, as vast as the sky, carried us for nine months.'],
    ['Bầu ơi thương lấy bí cùng, tuy rằng khác giống nhưng chung một giàn.', 'Ca dao', 'Gourd, love the squash: though you are different kinds, you share one trellis.'],
    ['Nhiễu điều phủ lấy giá gương, người trong một nước phải thương nhau cùng.', 'Ca dao', 'As red silk covers the mirror stand, people of one country must care for one another.'],
    ['Ai ơi bưng bát cơm đầy, dẻo thơm một hạt đắng cay muôn phần.', 'Ca dao', 'When you hold a full bowl of rice, remember: every soft, fragrant grain was grown through hardship.'],
    ['Gần mực thì đen, gần đèn thì sáng.', 'Tục ngữ', 'Stay near ink and you turn black; stay near a lamp and you shine.'],
    ['Ở hiền gặp lành.', 'Tục ngữ', 'Be kind and kindness will find you.'],
    ['Chậm mà chắc.', 'Tục ngữ', 'Slow but sure.'],
    ['Mỗi sáng thức dậy, ta lại được sinh ra một lần nữa. Điều ta làm hôm nay mới là quan trọng nhất.', 'Đức Phật', 'Each morning we are born again. What we do today is what matters most.'],
    ['Hạnh phúc là khi những gì bạn nghĩ, bạn nói và bạn làm hòa hợp với nhau.', 'Mahatma Gandhi', 'Happiness is when what you think, what you say, and what you do are in harmony.'],
    ['Ăn vóc học hay.', 'Tục ngữ', 'Eat to grow strong; learn to grow wise.'],
    ['Bán anh em xa, mua láng giềng gần.', 'Tục ngữ', 'A good neighbour nearby is worth more than relatives far away.'],
    ['Chị ngã em nâng.', 'Tục ngữ', 'When the older sister falls, the younger one helps her up.'],
    ['Có làm thì mới có ăn, không dưng ai dễ mang phần đến cho.', 'Ca dao', 'Only those who work will eat; no one brings you a share for nothing.'],
    ['Có đi mới đến, có học mới hay.', 'Tục ngữ', 'Only by going do you arrive; only by learning do you know.'],
    ['Đường đi khó không khó vì ngăn sông cách núi, mà khó vì lòng người ngại núi e sông.', 'Nguyễn Bá Học', 'A road is hard not because of the rivers and mountains, but because people fear them.'],
    ['Giấy rách phải giữ lấy lề.', 'Tục ngữ'],
    ['Hay học thì sang, hay làm thì có.', 'Tục ngữ', 'Study hard and you will rise; work hard and you will have.'],
    ['Kiến tha lâu cũng đầy tổ.', 'Tục ngữ', 'Ants carrying crumbs long enough fill the nest.'],
    ['Lửa thử vàng, gian nan thử sức.', 'Tục ngữ', 'Fire tests gold; hardship tests strength.'],
    ['Máu chảy ruột mềm.', 'Tục ngữ'],
    ['Muốn biết phải hỏi, muốn giỏi phải học.', 'Tục ngữ', 'To know, ask; to be good at it, learn.'],
    ['Nhất tự vi sư, bán tự vi sư.', 'Tục ngữ', 'Whoever teaches you a word, even half a word, is your teacher.'],
    ['Nói hay không bằng làm hay.', 'Tục ngữ', 'Doing well is better than speaking well.'],
    ['Ở bầu thì tròn, ở ống thì dài.', 'Tục ngữ'],
    ['Siêng làm thì có, siêng học thì hay.', 'Tục ngữ', 'Work diligently and you will have; study diligently and you will know.'],
    ['Tấc đất tấc vàng.', 'Tục ngữ', 'An inch of land is an inch of gold.'],
    ['Tiên học lễ, hậu học văn.', 'Tục ngữ', 'First learn manners, then learn letters.'],
    ['Trăm hay không bằng tay quen.', 'Tục ngữ', 'A hundred lessons are not worth a practised hand.'],
    ['Uốn cây từ thuở còn non, dạy con từ thuở con còn bi bô.', 'Ca dao', 'Bend the tree while it is young; teach the child while it is still babbling.'],
    ['Ăn trông nồi, ngồi trông hướng.', 'Tục ngữ'],
    ['Cha mẹ nuôi con biển hồ lai láng, con nuôi cha mẹ tính tháng tính ngày.', 'Ca dao', 'Parents raise their children with love as wide as the sea; children care for their parents counting the days.'],
    ['Đi hỏi già, về nhà hỏi trẻ.', 'Tục ngữ', 'Out in the world, ask the old; at home, ask the young.'],
    ['Khôn ngoan chẳng lọ thật thà, lường thưng tráo đấu chẳng qua đong đầy.', 'Ca dao'],
    ['Một con ngựa đau, cả tàu bỏ cỏ.', 'Tục ngữ', 'When one horse is sick, the whole stable stops eating.'],
    ['Nhập gia tùy tục.', 'Tục ngữ', 'When you enter a house, follow its customs.'],
    ['Quân tử nhất ngôn.', 'Tục ngữ', 'A gentleman\'s word is final.'],
    ['Ruộng sâu trâu nái không bằng con gái đầu lòng.', 'Tục ngữ'],
    ['Sai một li, đi một dặm.', 'Tục ngữ', 'Off by a hair, off by a mile.'],
    ['Tre già măng mọc.', 'Tục ngữ', 'As the old bamboo ages, new shoots grow.'],
    ['Trời sinh voi, trời sinh cỏ.', 'Tục ngữ', 'Heaven that made the elephant also made the grass.'],
    ['Vàng thật không sợ lửa.', 'Tục ngữ', 'True gold fears no fire.'],
    ['Ai giàu ba họ, ai khó ba đời.', 'Tục ngữ', 'No family stays rich for three generations, nor poor for three.'],
    ['Có công mài sắt, có ngày nên kim; có học có hành, có ngày nên người.', 'Tục ngữ', 'Grind iron long enough and it becomes a needle; study and practise and you grow into a fine person.'],
    ['Bàn tay có ngón ngắn ngón dài.', 'Tục ngữ', 'A hand has short fingers and long ones.'],
    ['Cây ngay không sợ chết đứng.', 'Tục ngữ', 'A straight tree is not afraid to die standing.'],
    ['Đất lành chim đậu.', 'Tục ngữ', 'Birds settle on good land.'],
    ['Giọt máu đào hơn ao nước lã.', 'Tục ngữ', 'Blood is thicker than water.'],
    ['Hữu xạ tự nhiên hương.', 'Tục ngữ', 'True musk needs no advertising: its scent speaks for itself.'],
    ['Mưa dầm thấm lâu.', 'Tục ngữ', 'Steady rain soaks in deep.'],
    ['Sông có khúc, người có lúc.', 'Tục ngữ', 'A river has its bends; a life has its turns.'],
    ['Thua keo này, bày keo khác.', 'Tục ngữ', 'Lose this round, set up another.'],
    ['Nhà sạch thì mát, bát sạch ngon cơm.', 'Tục ngữ', 'A clean house feels cool; a clean bowl makes the rice taste better.'],
    ['Cơm cha áo mẹ chữ thầy, gắng công mà học có ngày thành danh.', 'Ca dao', 'Rice from father, clothes from mother, letters from the teacher: study hard and one day you\'ll make your name.'],
    ['Ngày nay học tập, ngày mai giúp đời.', 'Khẩu hiệu học đường', 'Study today, help the world tomorrow.'],
    ['Non sông Việt Nam có trở nên tươi đẹp hay không… chính là nhờ một phần lớn ở công học tập của các em.', 'Hồ Chí Minh'],
    ['Một năm khởi đầu từ mùa xuân, một đời khởi đầu từ tuổi trẻ.', 'Hồ Chí Minh', 'A year begins with spring; a life begins with youth.'],
    ['Đời người chỉ sống có một lần. Phải biết sống cho ra sống.', 'Nikolai Ostrovsky', 'We live only once. We must learn to truly live.'],
    ['Sự học như con thuyền đi ngược nước, không tiến ắt phải lùi.', 'Khổng Tử', 'Learning is like rowing upstream: not to advance is to drop back.'],
    ['Người khôn không bao giờ nói những gì mình biết, nhưng luôn biết những gì mình nói.', 'Khuyết danh', 'The wise never say all they know, but always know what they say.'],
    ['Cuộc sống không phải là chờ cơn bão qua đi, mà là học cách khiêu vũ dưới mưa.', 'Vivian Greene', 'Life isn\'t about waiting for the storm to pass; it\'s about learning to dance in the rain.'],
    ['Hãy sống như thể ngày mai bạn sẽ chết, hãy học như thể bạn sẽ sống mãi mãi.', 'Mahatma Gandhi', 'Live as if you were to die tomorrow. Learn as if you were to live forever.'],
    ['Thiên tài là một phần trăm cảm hứng và chín mươi chín phần trăm mồ hôi.', 'Thomas Edison', 'Genius is one percent inspiration and ninety-nine percent perspiration.'],
    ['Tôi không thất bại. Tôi chỉ tìm ra mười nghìn cách không hiệu quả.', 'Thomas Edison', 'I have not failed. I\'ve just found ten thousand ways that won\'t work.'],
    ['Hạnh phúc không có nghĩa là mọi thứ đều hoàn hảo, mà là bạn đã quyết định nhìn xa hơn những khiếm khuyết.', 'Khuyết danh', 'Being happy doesn\'t mean everything is perfect. It means you\'ve decided to look beyond the imperfections.'],
    ['Gia đình không phải là điều quan trọng. Gia đình là tất cả.', 'Michael J. Fox', 'Family is not an important thing. It\'s everything.'],
    ['Điều tuyệt vời nhất cha mẹ làm cho con là yêu thương nhau.', 'Khuyết danh', 'The best thing parents can do for their children is to love each other.'],
    ['Trẻ em như búp trên cành, biết ăn ngủ, biết học hành là ngoan.', 'Hồ Chí Minh', 'Children are like buds on a branch; eating, sleeping and studying well is all we ask.'],
    ['Con là món quà quý nhất mà cuộc đời trao tặng.', 'Khuyết danh', 'A child is the most precious gift life can give.'],
    ['Mỗi ngày là một trang mới. Hãy viết điều tốt đẹp lên đó.', 'Khuyết danh', 'Every day is a new page. Write something good on it.'],
    ['Sống đơn giản, yêu thương nhiều, cười thật nhiều.', 'Khuyết danh', 'Live simply, love generously, laugh often.'],
    ['Người hạnh phúc nhất là người làm cho nhiều người khác hạnh phúc.', 'Denis Diderot', 'The happiest person is the one who makes the most people happy.'],
    ['Đọc sách hay cũng giống như trò chuyện với những bộ óc tuyệt vời nhất của quá khứ.', 'René Descartes', 'Reading good books is like a conversation with the finest minds of past centuries.'],
    ['Không có gì quý hơn độc lập, tự do.', 'Hồ Chí Minh', 'Nothing is more precious than independence and freedom.'],
    ['Nước Việt Nam là một, dân tộc Việt Nam là một.', 'Hồ Chí Minh', 'Vietnam is one country; the Vietnamese are one people.'],
    ['Một lần đi là một lần học.', 'Khuyết danh', 'Every trip is a lesson.'],
    ['Thà một phút huy hoàng rồi chợt tắt, còn hơn buồn le lói suốt trăm năm.', 'Xuân Diệu'],
    ['Mai sau dù có bao giờ, đốt lò hương ấy so tơ phím này.', 'Nguyễn Du'],
    ['Nam quốc sơn hà Nam đế cư.', 'Lý Thường Kiệt'],
    ['Dân ta phải biết sử ta, cho tường gốc tích nước nhà Việt Nam.', 'Hồ Chí Minh', 'Our people must know our history, to understand the roots of our country.']
  ];

  function at(i) {
    var q = Q[((i % Q.length) + Q.length) % Q.length];
    return { text: q[0], by: q[1] };
  }

  /** The same quote all day, a different one tomorrow (cycles through the list). */
  function today(date) {
    var d = date || new Date();
    var start = new Date(d.getFullYear(), 0, 1);
    var day = Math.floor((d - start) / 86400000);
    return at(day * 7 + d.getFullYear());
  }

  // ---- online, refreshed daily -------------------------------------------------------------------

  var CACHE = 'quotes.live';
  var ZEN_MAX = 600, PROVERBS_EVERY = 7 * 86400000;
  var live = { zen: [], proverbs: [] }, order = null, cursor = 0;

  /** Wikiquote wikitext → proverbs: one-line bullets, no variants ("a/b", "(…)"), links or headings. */
  function parseProverbs(wikitext) {
    var out = [];
    wikitext.split('\n').forEach(function (line) {
      var m = /^\*\s*([^*:\[{].*)$/.exec(line);
      if (!m) return;
      var t = m[1].replace(/'{2,}/g, '').trim();
      if (/[\/()\[\]{}<>|=]/.test(t) || t.length < 28 || t.length > 110) return;   // short ones are mostly idioms
      t = t.charAt(0).toUpperCase() + t.slice(1);
      if (!/[.!?…]$/.test(t)) t += '.';
      out.push({ text: t, by: 'Tục ngữ' });
    });
    return out;
  }

  /** A shuffle that stays put for the whole day (same order after a reload), different tomorrow. */
  function shuffled(list, seed) {
    var a = list.slice(), x = seed;
    for (var i = a.length - 1; i > 0; i--) {
      x = (x * 1103515245 + 12345) % 2147483648;
      var j = x % (i + 1), t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function dayKey(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }

  var EN = root.I18n && I18n.en;

  /** Today's new sayings, the curated ones and the proverbs take turns, each source a third of the time. */
  function buildOrder() {
    var seed = dayKey(new Date());
    var zen = live.zen.filter(function (q) { return EN ? q.en : q.text; }).map(function (q) {
      return EN ? { text: q.en, by: (q.author || 'Unknown') + ' · ZenQuotes' } : q;
    });
    var curated = Q.filter(function (q) { return !EN || q[2]; }).map(function (q) {
      return EN ? { text: q[2], by: T(q[1]) } : { text: q[0], by: q[1] };
    });
    var lists = [shuffled(zen, seed), shuffled(curated, seed + 1), shuffled(EN ? [] : live.proverbs, seed + 2)]
      .filter(function (l) { return l.length; });
    order = [];
    var n = Math.max.apply(null, lists.map(function (l) { return l.length; }));
    for (var i = 0; i < n; i++) lists.forEach(function (l) { order.push(l[i % l.length]); });   // short lists come round again
    cursor = Math.floor(Date.now() / 60000) % order.length;   // not the same first saying on every start
  }

  function next() {
    if (!order) buildOrder();
    var q = order[cursor % order.length];
    cursor++;
    return q;
  }

  function zenQuotes(cb) {
    Platform.getJSON('https://zenquotes.io/api/quotes', function (err, data) {
      var list = (!err && data && data.length ? data : []).filter(function (q) {
        return q.q && q.a && q.q.length < 160 && !/zenquotes/i.test(q.a) && !(root.History && History.GRIM.test(q.q));
      }).slice(0, 50);
      if (!list.length || !root.History) return cb([]);
      // Translate in chunks: one long request would pass the URL length limit.
      var out = [], chunks = [];
      for (var i = 0; i < list.length; i += 10) chunks.push(list.slice(i, i + 10));
      (function step(k) {
        if (k >= chunks.length) return cb(out);
        History.translate(chunks[k].map(function (q) { return q.q; }), function (vi) {
          chunks[k].forEach(function (q, j) {
            // Kept in both languages; the Vietnamese screen skips one that could not be translated.
            out.push({ text: vi[j] && vi[j] !== q.q ? vi[j] : '', en: q.q, author: q.a,
              by: (q.a === 'Unknown' ? 'Khuyết danh' : q.a) + ' · ZenQuotes' });
          });
          step(k + 1);
        });
      })(0);
    }, 15000);
  }

  function proverbs(cb) {
    Platform.getJSON('https://vi.wikiquote.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2' +
      '&origin=*&page=' + encodeURIComponent('Tục ngữ Việt Nam'), function (err, data) {
      cb(!err && data && data.parse ? parseProverbs(data.parse.wikitext || '') : []);
    }, 15000);
  }

  /** Today's sayings go in front of the stored ones; the same saying twice is kept once. */
  function addToStore(fresh, old) {
    var seen = {}, out = [];
    fresh.concat(old || []).forEach(function (q) {
      var key = q.en || q.text;
      if (seen[key]) return;
      seen[key] = true;
      out.push(q);
    });
    return out.slice(0, ZEN_MAX);
  }

  function load(cb) {
    cb = cb || function () {};
    var today = dayKey(new Date()), cached = Platform.store.get(CACHE, null);
    if (cached && ((cached.zen || []).length || (cached.proverbs || []).length)) { live = cached; order = null; }
    if (cached && cached.day === today) return cb();
    var got = { day: today, zen: cached ? cached.zen || [] : [], proverbs: cached ? cached.proverbs || [] : [],
      proverbsAt: cached ? cached.proverbsAt || 0 : 0 };
    var left = 1;
    function done() {
      if (--left) return;
      live = got;
      order = null;
      if (got.zen.length || got.proverbs.length) Platform.store.set(CACHE, got);
      cb();
    }
    zenQuotes(function (l) { got.zen = addToStore(l, got.zen); done(); });   // offline: the store stays as it is
    if (!got.proverbs.length || Date.now() - got.proverbsAt > PROVERBS_EVERY) {
      left++;
      proverbs(function (l) { if (l.length) { got.proverbs = l; got.proverbsAt = Date.now(); } done(); });
    }
  }

  root.Quotes = { today: today, at: at, count: Q.length, next: next, load: load, parseProverbs: parseProverbs, addToStore: addToStore,
    size: function () { if (!order) buildOrder(); return order.length; } };
})(this);
