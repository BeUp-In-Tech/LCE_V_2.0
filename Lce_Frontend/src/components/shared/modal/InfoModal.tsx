import { X } from "lucide-react";
import { priceListData } from "../../../types/types";


interface ModalProps {
  isOpne: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const InfoModal: React.FC<ModalProps> = ({ isOpne, setIsOpen }) => {
  return (
    <div
      className={`fixed px-3 inset-0 z-10 flex items-center justify-center transition-opacity duration-300 ${isOpne ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      <div
        className="absolute inset-0 bg-black/25 "
        onClick={() => setIsOpen(false)} />
      <div className={`w-full max-w-145 relative z-10 bg-white rounded-xl p-2 flex transition-all duration-300 ease-out ${isOpne ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}>
        <div className="w-full rounded-xl flex flex-col overflow-y-auto custom-scrollbar max-h-[70vh]">
          <div className="px-6 py-3">
            {priceListData.map((category, index) => (
              <section key={index} className="mb-8">
                <h2 className="text-gray-800 font-bold text-lg flex items-center gap-2">
                  {category.title}
                  {category.subtitle && (
                    <span className="text-gray-400 font-normal text-sm italic">
                      {category.subtitle}
                    </span>
                  )}
                </h2>
                <div className="mt-4 space-y-4">
                  {category.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex justify-between">
                      <div className="flex gap-1">
                        <span className="text-gray-600 font-medium">
                          {item.name}
                        </span>
                        {item.note && (
                          <span className="text-gray-400 text-xs italic">
                            {item.note}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-700 font-semibold">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
        {}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-5"
        >
          <X className="text-gray-400" />
        </button>
      </div>
    </div>
  );
};

export default InfoModal;
