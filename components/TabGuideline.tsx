// Audit: Code file description updated for deployment - 2026-04-15
import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Lightbulb, Rocket, Shield, Zap, Clock, Bell, BarChart3, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

export default function TabGuideline() {
  const [origin, setOrigin] = useState('https://<domain-cua-ban>');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line
      setOrigin(window.location.origin);
    }
  }, []);
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Hướng dẫn & Tính năng</h2>
        </div>
        <p className="text-gray-500 ml-13">Tổng quan về các tính năng hiện tại của hệ thống và định hướng phát triển tương lai.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Current Features */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            Tính năng hiện tại
          </h3>
          
          <div className="space-y-4">
            <FeatureCard 
              icon={<Zap className="w-5 h-5 text-amber-500" />}
              title="Khám phá & Đánh giá (News Feed)"
              description="Tự động cào tin tức từ các nguồn RSS và lưu trữ vào Supabase. Sử dụng AI (Gemini/Groq) để chấm điểm mức độ quan trọng của tin tức. Tích hợp dữ liệu giá Crypto realtime từ CoinGecko để AI có góc nhìn thực tế nhất."
              details={
                <ul className="list-disc pl-5 space-y-2 mt-2 text-sm text-gray-700">
                  <li><strong>Cách dùng:</strong> Vào tab &quot;Khám phá&quot;, nhấn &quot;Lấy tin mới&quot; để hệ thống cào tin từ các nguồn RSS đã cấu hình.</li>
                  <li><strong>Chấm điểm AI:</strong> Nhấn &quot;Chấm điểm AI&quot; để Gemini đọc nội dung và chấm điểm từ 1-10 dựa trên tiêu chí bạn đã thiết lập.</li>
                  <li><strong>Lưu trữ:</strong> Các tin tức sau khi cào sẽ được tự động lưu vào database Supabase để không bị mất khi tải lại trang.</li>
                </ul>
              }
            />
            <FeatureCard 
              icon={<SendIcon className="w-5 h-5 text-sky-500" />}
              title="Quản lý & Gửi Telegram (Dispatcher)"
              description="Quản lý các tin tức đã được đánh giá. Hỗ trợ tạo bản tin tóm tắt (Basic) hoặc phân tích chuyên sâu (Advanced) bằng AI. Gửi trực tiếp báo cáo đến Telegram thông qua Bot API với định dạng đẹp mắt."
              details={
                <ul className="list-disc pl-5 space-y-2 mt-2 text-sm text-gray-700">
                  <li><strong>Lọc tin:</strong> Chọn các tin tức có điểm số cao (VD: 8-10) để chuẩn bị gửi.</li>
                  <li><strong>Bản tin Basic:</strong> AI sẽ tóm tắt ngắn gọn từng tin thành dạng danh sách (bullet points).</li>
                  <li><strong>Bản tin Advanced:</strong> AI sẽ viết một bài phân tích sâu sắc, kết hợp giá Crypto realtime và danh mục đầu tư của bạn để đưa ra nhận định xu hướng.</li>
                  <li><strong>Gửi Telegram:</strong> Nhấn &quot;Gửi Telegram&quot; để đẩy trực tiếp bản tin vừa tạo vào Group/Channel của bạn.</li>
                </ul>
              }
            />
            <FeatureCard 
              icon={<SettingsIcon className="w-5 h-5 text-gray-600" />}
              title="Cấu hình hệ thống & Prompts (Settings)"
              description="Quản lý an toàn các API Keys (Supabase, Gemini, Groq, Telegram). Tuỳ chỉnh danh sách nguồn RSS và toàn bộ các câu lệnh (Prompts) cho AI một cách linh hoạt."
              details={
                <ul className="list-disc pl-5 space-y-2 mt-2 text-sm text-gray-700">
                  <li><strong>API Keys:</strong> Nhập các key cần thiết. Dữ liệu này chỉ lưu trên trình duyệt của bạn (Local Storage), không gửi lên server ngoài ý muốn.</li>
                  <li><strong>Nguồn RSS:</strong> Thêm hoặc bớt các link RSS (mỗi link 1 dòng) để thay đổi nguồn tin tức.</li>
                  <li><strong>Cấu hình Prompts AI:</strong> Bạn có thể sửa đổi toàn bộ các câu lệnh (Prompts) mà hệ thống gửi cho AI (Báo cáo tổng hợp, Telegram, Phân tích danh mục, Phân tích tâm lý). Việc này giúp bạn toàn quyền kiểm soát văn phong, định dạng và nội dung mà AI tạo ra.</li>
                </ul>
              }
            />
            <FeatureCard 
              icon={<Shield className="w-5 h-5 text-emerald-500" />}
              title="Bảo mật (Security)"
              description="Hệ thống đăng nhập an toàn với mật khẩu được băm (SHA-256), bảo vệ dữ liệu và API keys khỏi việc truy cập trái phép."
              details={
                <ul className="list-disc pl-5 space-y-2 mt-2 text-sm text-gray-700">
                  <li><strong>Mật khẩu Hash:</strong> Mật khẩu không bao giờ được lưu dưới dạng văn bản thô (raw text) trong code hay biến môi trường.</li>
                  <li><strong>Cách đổi mật khẩu:</strong> Tạo mã băm SHA-256 cho mật khẩu mới của bạn và cập nhật vào biến môi trường <code>NEXT_PUBLIC_ADMIN_PASSWORD_HASH</code> trên Vercel.</li>
                </ul>
              }
            />
            <FeatureCard 
              icon={<Clock className="w-5 h-5 text-blue-500" />}
              title="Tự động hoá (Auto-Scheduler & Cron Jobs)"
              description="Hỗ trợ API Cron Job (/api/cron) để tự động lấy tin, chấm điểm, phân tích và gửi báo cáo Telegram vào các khung giờ cố định mà không cần thao tác thủ công."
              details={
                <div className="mt-2 text-sm text-gray-700 space-y-4">
                  <p>Hệ thống cung cấp sẵn API tại <code>/api/cron</code> để chạy toàn bộ quy trình tự động. Có 2 cách để thiết lập:</p>
                  
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-2">Cách 1: Dùng Vercel Cron (Khuyên dùng nếu host trên Vercel)</h5>
                    <p className="mb-2">Vercel Cron sẽ gửi request <strong>GET</strong>. Do đó, bạn <strong>BẮT BUỘC</strong> phải cấu hình toàn bộ API Keys trong phần <strong>Environment Variables</strong> của Vercel (bao gồm cả <code>CRON_SECRET</code>).</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Tạo file <code>vercel.json</code> ở thư mục gốc của dự án (đã có sẵn trong code).</li>
                      <li>Vào Vercel Dashboard {'>'} Settings {'>'} Environment Variables, thêm biến <code>CRON_SECRET</code> (ví dụ: my-super-secret-cron-key-123).</li>
                      <li>Hệ thống sẽ tự động lấy danh sách RSS và Tiêu chí đánh giá từ Database (bảng <code>app_settings</code>) nếu bạn đã nhấn &quot;Lưu cài đặt&quot; ở tab Cài đặt.</li>
                    </ol>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-2">Cách 2: Dùng cron-job.org (Hoặc các dịch vụ bên thứ 3)</h5>
                    <p className="mb-2">Dịch vụ ngoài cần gửi request <strong>POST</strong> kèm theo cấu hình của bạn.</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Tạo tài khoản trên <strong>cron-job.org</strong>.</li>
                      <li>Tạo Job mới gọi <strong>POST</strong> đến <code>{origin}/api/cron</code>.</li>
                      <li>Thêm Header: <code>Authorization: Bearer [Cron Secret Key của bạn]</code>.</li>
                      <li>Truyền Body (JSON) chứa cấu hình API keys và RSS của bạn. (Xem chi tiết trong file <code>DOCUMENTATION.md</code>).</li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Lên lịch từ Telegram?</h5>
                    <p className="text-blue-800">Telegram Bot <strong>không có sẵn tính năng tự động lên lịch (scheduler)</strong>. Để Bot tự động gửi tin nhắn mỗi ngày, bạn <strong>bắt buộc</strong> phải dùng Vercel Cron hoặc cron-job.org để &quot;kích hoạt&quot; hệ thống. Khi hệ thống được kích hoạt, nó sẽ tự động lấy tin, dùng AI phân tích và gửi kết quả vào Telegram của bạn.</p>
                  </div>

                  <p className="text-blue-600 font-medium flex items-center gap-1">
                    <Lightbulb className="w-4 h-4" /> 
                    Mẹo: Bạn có thể nhấn nút &quot;Chạy thử Cron Job ngay&quot; ở tab Cài đặt để kiểm tra xem luồng tự động có hoạt động và gửi tin nhắn Telegram thành công hay không.
                  </p>
                </div>
              }
            />
            <FeatureCard 
              icon={<BarChart3 className="w-5 h-5 text-indigo-500" />}
              title="Phân tích dữ liệu lịch sử (Sentiment Trend)"
              description="Biểu đồ trực quan hoá xu hướng tâm lý thị trường (Bullish/Bearish) qua các ngày dựa trên điểm số và phân tích của AI."
              details={
                <ul className="list-disc pl-5 space-y-2 mt-2 text-sm text-gray-700">
                  <li><strong>Cách hoạt động:</strong> Mỗi khi Cron Job chạy, AI sẽ đọc các tin tức Hot nhất trong ngày và chấm điểm Bullish (Lạc quan) / Bearish (Bi quan) từ 0-100.</li>
                  <li><strong>Lưu trữ:</strong> Dữ liệu này được lưu vào bảng <code>market_sentiment</code> trên Supabase.</li>
                  <li><strong>Biểu đồ:</strong> Tab &quot;Tâm lý&quot; sẽ vẽ biểu đồ diện tích (Area Chart) 30 ngày gần nhất để bạn dễ dàng theo dõi xu hướng dòng tiền và tâm lý đám đông.</li>
                </ul>
              }
            />
            <FeatureCard 
              icon={<Rocket className="w-5 h-5 text-purple-500" />}
              title="Theo dõi danh mục (Portfolio Tracking)"
              description="Cho phép người dùng nhập danh mục đầu tư. AI sẽ cá nhân hoá báo cáo, phân tích xem tin tức ảnh hưởng thế nào đến chính danh mục đó."
              details={
                <ul className="list-disc pl-5 space-y-2 mt-2 text-sm text-gray-700">
                  <li><strong>Quản lý:</strong> Thêm mã Coin (VD: BTC, ETH, SOL) và số lượng bạn đang nắm giữ tại tab &quot;Danh mục&quot;.</li>
                  <li><strong>Phân tích trực tiếp:</strong> Nhấn nút &quot;Phân tích Tác động (AI)&quot; để AI đọc tin tức mới nhất và đánh giá xem danh mục của bạn sẽ tăng hay giảm.</li>
                  <li><strong>Tích hợp Telegram:</strong> Khi tạo báo cáo Advanced, AI cũng tự động chèn thêm phần phân tích tác động riêng cho danh mục của bạn vào bản tin.</li>
                </ul>
              }
            />
          </div>
        </div>

        {/* Future Ideas */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
            <Lightbulb className="w-6 h-6 text-amber-500" />
            Đề xuất tính năng mới (Tương lai)
          </h3>
          
          <div className="space-y-4">
            <FeatureCard 
              icon={<Bell className="w-5 h-5 text-red-500" />}
              title="Cảnh báo khẩn cấp (Real-time Alerts)"
              description="Gửi thông báo ngay lập tức nếu phát hiện các từ khoá nhạy cảm (VD: 'SEC', 'Hack') hoặc tin tức có điểm số tuyệt đối (10/10)."
            />
            <FeatureCard 
              icon={<MessageSquare className="w-5 h-5 text-teal-500" />}
              title="Đa kênh phân phối (Multi-Channel)"
              description="Mở rộng khả năng gửi báo cáo sang Discord, Slack, Email hoặc tự động đăng bài lên Twitter/X."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, details }: { icon: React.ReactNode, title: string, description: string, details?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className={`bg-white p-5 rounded-xl border transition-all duration-200 ${isOpen ? 'border-blue-200 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md cursor-pointer'}`}
      onClick={() => !isOpen && details && setIsOpen(true)}
    >
      <div className="flex items-start gap-4">
        <div className="mt-1 bg-gray-50 p-2 rounded-lg shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={(e) => {
              if (details) {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }
            }}
          >
            <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
            {details && (
              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          
          {isOpen && details && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
              {details}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper icons to avoid importing too many from lucide-react at the top if not needed
function SendIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z"/>
      <path d="M22 2 11 13"/>
    </svg>
  );
}

function SettingsIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
