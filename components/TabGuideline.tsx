'use client';

import { 
  BookOpen, 
  Shield, 
  Zap, 
  Globe, 
  DollarSign, 
  TrendingUp,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function TabGuideline() {
  const principles = [
    {
      title: "Hệ thống Petrodollar",
      desc: "Bản chất của sức mạnh Mỹ nằm ở việc dầu mỏ được thanh toán bằng USD. Bất kỳ sự chuyển dịch nào sang CNY hay EUR đều là mối đe dọa trực tiếp đến ngai vàng Đô la.",
      icon: DollarSign,
      color: "text-blue-400"
    },
    {
      title: "Ván bài của Market Makers (MM)",
      desc: "MM không chỉ đẩy giá để kiếm lời, họ đẩy giá để điều hướng dòng vốn toàn cầu. Khi thế giới bất ổn, MM sẽ tạo ra các 'thiên đường thanh khoản' như Crypto để hút tiền.",
      icon: Zap,
      color: "text-amber-400"
    },
    {
      title: "Crypto là Digital Dollar",
      desc: "Đừng nhìn Crypto như một thứ đối lập với USD. Trong ván bài lớn, BTC và Stablecoins là công cụ để Mỹ số hóa sự thống trị tài chính của mình.",
      icon: Shield,
      color: "text-emerald-400"
    },
    {
      title: "Địa chính trị là lớp vỏ",
      desc: "Chiến tranh, xung đột thường là cái cớ để tái cấu trúc dòng chảy tiền tệ. Hãy tập trung vào dòng tiền, đừng tập trung vào cảm xúc đám đông.",
      icon: Globe,
      color: "text-purple-400"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <section className="text-center space-y-4">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Triết lý đầu tư của Bum Expert
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          "Khi thị trường làm bạn chán nản nhất, đó là lúc cơ hội lớn đang được âm thầm chuẩn bị cho một chu kỳ khác biệt."
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {principles.map((p, i) => (
          <div key={i} className="glass-card p-6 hover:bg-white/10 transition-all group">
            <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <p.icon className={p.color} size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">{p.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {p.desc}
            </p>
          </div>
        ))}
      </div>

      <section className="glass-card p-8 border-blue-500/20 bg-blue-500/5">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="text-blue-400" />
          Lộ trình phân tích
        </h3>
        <div className="space-y-6">
          {[
            "Theo dõi dòng chảy Petrodollar qua tin tức dầu mỏ và địa chính trị.",
            "Phân tích sức mạnh chỉ số DXY và sự chuyển dịch sang tài sản số.",
            "Quan sát động thái của các quỹ ETF và dòng tiền tổ chức Mỹ.",
            "Xác định điểm đảo chiều tâm lý khi đám đông rơi vào trạng thái mù mờ."
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                {i + 1}
              </div>
              <p className="text-gray-300">{step}</p>
              <ChevronRight className="ml-auto text-gray-600" size={18} />
            </div>
          ))}
        </div>
      </section>

      <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex gap-3">
        <AlertCircle className="text-red-400 shrink-0" size={20} />
        <p className="text-xs text-gray-500 italic">
          Lưu ý: Đây là góc nhìn vĩ mô cá nhân, không phải lời khuyên đầu tư. Thị trường tài chính luôn tiềm ẩn rủi ro cao.
        </p>
      </div>
    </div>
  );
}
