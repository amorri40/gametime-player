// 
    // # Emscripten callbacks 
    //

    window.rombanks={}
    window.cycleRuns={}
    window.opcodes={}
    window.pc_addresses={}
    window.memory_reads={}
    window.romdata_pointer=0;
    window.changeable_reads={}
    window.written_memory={}
    // 
    // # rom_bank1_addresses hold the emscirpten heap address of each rom bank
    // 
    window.rom_bank1_addresses={}
    window.setRombank = function(rombank, emscripten_ram_address) { window.rombanks[rombank] = emscripten_ram_address;}
    window.setRambank = function(enableRam, rambank, a, b) {
      console.log("Enable RAM BANK",enableRam, rambank, a,b);
    }
    // 
    // Rombank0 should be fixed
    // 
    window.setRombank0 = function() {
      console.error('Rombank0 should be fixed');
    }

    // 
    // # setRombank1 is called when rombank number 1 is switched
    // 
    window.setRombank1 = function(romdata_pointer, rombank_number, bank_offset, full_address) {
      if (window.rom_bank1_addresses[rombank_number] !== full_address)
        {
          window.rom_bank1_addresses[rombank_number] = full_address; 
          // window.romdata_pointer = romdata_pointer;
          console.log("Switched RomBank1 to:", rombank_number, "Address in Emscripten:", full_address, "Start address of all Rom banks:",romdata_pointer, "Bank Offset:",bank_offset);
        }
    }
    
    window.resetPointers = function(rombanks,rambanks, wrambanks, romdata_pointer, rombank1_pointer, rambankdata_, wramdata_0, wramdataend_,rdisabledRamw) {
      console.log('ReSet Pointers', romdata_pointer, 'Rom banks:',rombanks, 'Cartridge Ram Banks:',rambanks, 'Working RAM banks:', wrambanks);
      window.romdata_pointer = romdata_pointer;
    }

    window.romWrite = function($0, $1, $2) {}
    window.runForLog = function(cycles) {
       window.cycleRuns[cycles] = true;
    }

    window.refreshPalettes=function(bgPalette) {}
    // 
    // reset CC seems to be done on every writeState serialise
    // 
    window.resetCC = function(oldcc, newcc) {
      // window.rombanks={};
      // window.opcodes_at_reset = JSON.stringify(window.opcodes);//$.extend({}, window.opcodes);
      window.opcodes={};
      // console.log('resetCC old CC:',$0,$1)
    }
    window.loadRomInfo = function(a,b,c) {console.log('rominfo',a,b,c)}
    window.speedChange = function(a,b,c) {console.log('speedChnage',a,b,c)}
    window.setGameShark= function(address, value) {}
    window.cpuSaveState = function(cycleCounter_, pc_, stackPointer, accumulator, b, c,d,e,hf2, carryFlag, zeroFlag,h,l,skip_) {
      // console.log("cpuSaveState", pc_);
    }
    window.memHalted = function() {}
    window.opcode = function(opcode, address) {
      // window.opcodes[opcode] =window.opcodes[opcode]+1 || 1 ;
      //window.pc_addresses[address] = opcode;
    }

    

    // 
    // # Need to get rombank by checking the ram start address of this memory address
    //  and then subtrack it from the know start of the rom data.
    //  and finally divide by 16Kb to get the rombank number
    //  Adding one to make sure it has the same value as setRomBank
    // 
    window.calculate_rom_bank = function(first_address_in_current_rom_bank) {
      var rombank = ((first_address_in_current_rom_bank-window.romdata_pointer) / window._16kb)+1;
      return rombank;
    }

    window.emscripten_ram_pointer_to_gb_rom_address = function(emscripten_address) {
      return emscripten_address-window.romdata_pointer;
    }

    var should_hook_memory = false;

if (should_hook_memory) {
    window.trivialReadMemory = function(gameboy_address,fullAddress, valueInMemory) {
      
      // var rombank = window.calculate_rom_bank(ram_start_of_gameboy_cart_data);
      var calculated_gb_address = window.emscripten_ram_pointer_to_gb_rom_address(fullAddress);

      if (calculated_gb_address in window.memory_reads) {
        if (window.memory_reads[calculated_gb_address] !== valueInMemory.toString(16)) {
            // console.log('Value did change')
            window.changeable_reads[calculated_gb_address] = true;
        }
        return;
      }
      window.memory_reads[calculated_gb_address] = valueInMemory.toString(16);
    }

    // 
    // Writes to Internal Working RAM (8Kb - 8192bytes)
    //  0xC000 -> 0xDFFF
    //  49152 -> 57343
    // 
    window.trivialWriteMemory = function(gameboy_address,fullAddress, valueInMemory, dataToWrite) { 
        if (valueInMemory === dataToWrite) return;
        window.written_memory[gameboy_address]=[valueInMemory,dataToWrite];
    }

}
else {
  window.trivialReadMemory = window.trivialWriteMemory  = function() {}
}